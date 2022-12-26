"use strict";

import * as THREE from 'three';
import { Vector3, Matrix4, Box3 } from 'three';

export class QuantumObject
{
    light;

    observed;
    boundingBoxes;

    activeObj;
    switchReady;

    invertZ;
    sceneToView;

    constructor(objs, camera, visionAngle)
    {
        this.objs = objs;
        this.boundingBoxes = objs.map(function(e) { return e.geometry.boundingBox; });

        this.camera = camera;
        this.light = camera.getLight();
        this.visionAngle = visionAngle;
        
        this.observed = [false * objs.length];
        this.activeObj = 0;
        this.switchReady = false;

        this.objs.map(function(e) { e.visible = true; });
        this.objs[this.activeObj].visible = true;

        this.invertZ = new THREE.Matrix4();

        this.invertZ.set(   1, 0, 0, 0,
                            0, 1, 0, 0,
                            0, 0,-1, 0,
                            0, 0, 0, 1);
                            
        this.sceneToView = new THREE.Matrix4();
    }

    update()
    {
        this.sceneToView.multiplyMatrices(this.light.matrixWorld, this.invertZ).invert();

        for (var i = 0; i < this.objs.length; i++)
        {
            if (this.camera.getLightVisibility())
                this.observed[i] = this.boxConeIntersect(this.objs[i], this.boundingBoxes[i]);
            else
                this.observed[i] = false;
        }

        if (!this.switchReady && this.observed[this.activeObj])
            this.switchReady = true;
 
        if (this.switchReady && !this.observed[this.activeObj])
        {
            var prevPos = this.activeObj;
            while (this.activeObj == prevPos || this.observed[this.activeObj])
                this.activeObj = Math.floor(Math.random() * this.objs.length);
            
            this.objs[prevPos].visible = true;
            this.objs[this.activeObj].visible = true;
            this.switchReady = false;
        }
    }

    boxConeIntersect(obj, boundingBox)
    {
        // THIS FIRST CONVERTS EVERYTHING TO COORDINATES CENTRED ON AND
        // FACING AWAY FROM THE LIGHT SOURCE, ALL FURTHER CALCULATION IS 
        // DONE FROM THE POINT OF VIEW OF THE LIGHT CONE

        // Get vertices of bounding box
        const low = boundingBox.min;
        const high = boundingBox.max;

        const transMat = new THREE.Matrix4()
        transMat.multiplyMatrices(this.sceneToView, obj.matrixWorld);

        // CAN'T APPLY TRANSFORMATION TO BOUNDING BOX DIRECTLY SINCE IT WILL ONLY
        // APPLY IT TO THE MIN AND MAX CORNERS, THEN MAKE THE REST OF THE BOX CONFORM
        // TO THE WORLD AXIS
        const verts = [
            new Vector3(low.x,  low.y,  low.z ).applyMatrix4(transMat),
            new Vector3(high.x, low.y,  low.z ).applyMatrix4(transMat),
            new Vector3(low.x,  high.y, low.z ).applyMatrix4(transMat),
            new Vector3(high.x, high.y, low.z ).applyMatrix4(transMat),
            new Vector3(low.x,  low.y,  high.z).applyMatrix4(transMat),
            new Vector3(high.x, low.y,  high.z).applyMatrix4(transMat),
            new Vector3(low.x,  high.y, high.z).applyMatrix4(transMat)
        ];

        // Get base, and up/across point for each face (for p, u, v)
        const planes = [
            [verts[0], verts[1], verts[2]],
            [verts[0], verts[1], verts[4]],
            [verts[0], verts[2], verts[4]],
            [verts[1], verts[3], verts[5]],
            [verts[2], verts[3], verts[6]],
            [verts[4], verts[5], verts[6]]
        ];

        var uVec = new Vector3();
        var vVec = new Vector3();

        // Calculate intersection for each face
        for (var i = 0; i < 6; i++)
            if (this.planeConeIntersection(planes[i][0],
                    uVec.subVectors(planes[i][1], planes[i][0]),
                    vVec.subVectors(planes[i][2], planes[i][0])))
                return true;
            
        return false;
    }

    planeConeIntersection(p, u, v)
    {
        var v3 = new Vector3();

        // Calculate intersection for each line segment first (most cases)
        var intersection = 
            this.lineConeIntersection(p, u) ||
            this.lineConeIntersection(v3.addVectors(p, v), u) ||
            this.lineConeIntersection(p, v) ||
            this.lineConeIntersection(v3.addVectors(p, u), v)

        if (intersection)
            return true;

        // Now deal with edge case where face is entirely inside cone
        //  or cone is entirely within face

        // First check if face entirely within cone, this happens if the
        //  centre-point of the face is in the cone
        const centre = new Vector3();
        centre.addVectors(u, v);
        centre.divideScalar(2);
        centre.add(p);

        if (centre.z >= this.camera.near && centre.z <= this.camera.far)
        {
            const r = centre.z * Math.tan(this.visionAngle);
            const r2 = r * r;

            if (centre.x * centre.x + centre.y * centre.y <= r2)
                return true;
        }

        // Now for the worst case! The cone is entirely within the face
        // First calculate the cartesian coefficients (normal to face)
        const n = new Vector3();
        n.crossVectors(u, v);

        // Calculate d component of cartesian equation
        const d = -n.dot(p);

        if (n.z == 0)
            return false;

        // Calculate M, the point along the cones' axis that intersects with the plane
        const M = new Vector3(0, 0, -d / n.z);
        // Calculate MP so we can check if it's within the face
        const MP = new Vector3();
        MP.subVectors(M, p);

        // Find the parametric coefficients, these should both be 0-1 if it's
        //  in the face
        const a = (MP.y * v.x - MP.x * v.y) / (u.y * v.x - u.x * v.y);
        const b = (MP.y * u.x - MP.x * u.y) / (v.y * u.x - v.x * u.y);

        // Also make sure that M is not behind camera or too far away
        return a >= 0
            && a <= 1
            && b >= 0
            && b <= 1
            && M.z >= this.camera.getCamera().near
            && M.z <= this.camera.getCamera().far;
    }

    lineConeIntersection(p, u)
    {
        // This is just solving some polynomials not too hard
        // The maximum distance the line can be from the cone at point z
        //  is z*tan(theta)
        const tan = Math.tan(this.visionAngle);
        const tanSq = tan * tan;

        const A = u.x * u.x + u.y * u.y - u.z * u.z * tanSq;
        const B = 2 * p.x * u.x + 2 * p.y * u.y - 2 * p.z * u.z * tanSq;
        const C = p.x * p.x + p.y * p.y - p.z * p.z * tanSq;

        const delta = B * B - 4 * A * C;
        if (delta < 0)
            return false;

        if (A != 0)
        {
            const t1 = (-B + Math.sqrt(delta)) / (2 * A);
            const t2 = (-B - Math.sqrt(delta)) / (2 * A);

            const z1 = p.z + t1 * u.z;
            const z2 = p.z + t2 * u.z;

            return (t1 >= 0 && t1 <= 1 && z1 >= this.camera.getCamera().near && z1 <= this.camera.getCamera().far)
                || (t2 >= 0 && t2 <= 1 && z2 >= this.camera.getCamera().near && z2 <= this.camera.getCamera().far);
        }
        if (B != 0)
        {
            const t = -C / B;
            const z = p.z + t * u.z;

            return t1 >= 0 && t1 <= 1 && z1 >= this.camera.getCamera().near && z1 <= this.camera.getCamera().far;
        }
        else return C == 0;
    }
}