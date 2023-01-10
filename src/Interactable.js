"use strict";

import * as THREE from 'three';
import { Vector3, Vector2 } from 'three';

export class Interactable
{
    observed;
    object;
    boundingBox;

    invertZ;
    sceneToView;
    viewToClip;

    active;

    constructor(object, boundingBox, quantumGroup)
    {
        this.object = object;

        this.boundingBox = boundingBox;

        this.quantumGroup = quantumGroup;

        this.active = true;
        
        this.observed = false;

        this.invertZ = new THREE.Matrix4();

        this.invertZ.set(   1, 0, 0, 0,
                            0, 1, 0, 0,
                            0, 0,-1, 0,
                            0, 0, 0, 1);
                            
        this.sceneToView = new THREE.Matrix4();

        this.viewToClip = new THREE.Matrix4();
    }

    update(camera)
    {
        const n = 1 / camera.getCamera().near;
        this.viewToClip.set(    1, 0, 0, 0,
                                0, 1, 0, 0,
                                0, 0, 1, 0,
                                0, 0, n, 0);

        this.sceneToView.multiplyMatrices(camera.getLight().matrixWorld, this.invertZ).invert();

        if (camera.getLightVisibility())
            this.observed = this.boxConeIntersect(this.object, this.boundingBox, camera);
        else
            this.observed = false;
    }

    // NOTE: DOES NOT COVER ALL CASES, OBJECTS CONSIDERED INVISIBLE IF ONE VERTEX IS BEHIND THE
    //  CAMERA, OBJECTS ALSO INVISIBLE IF NO EDGES ARE VISIBLE (E.G. VERY LARGE VERY CLOSE OBJECTS)
    // This decision was made to optimise performance, as these cases are never encountered in-game.
    boxConeIntersect(obj, boundingBox, camera)
    {
        // Get vertices of bounding box
        const low = boundingBox.min;
        const high = boundingBox.max;

        const localToView = new THREE.Matrix4();
        localToView.multiplyMatrices(this.sceneToView, obj.matrixWorld);

        // CAN'T APPLY TRANSFORMATION TO BOUNDING BOX DIRECTLY SINCE IT WILL ONLY
        // APPLY IT TO THE MIN AND MAX CORNERS, THEN MAKE THE REST OF THE BOX CONFORM
        // TO THE WORLD AXIS
        const verts = [
            new Vector3(low.x,  low.y,  low.z ).applyMatrix4(localToView),
            new Vector3(high.x, low.y,  low.z ).applyMatrix4(localToView),
            new Vector3(high.x, high.y, low.z ).applyMatrix4(localToView),
            new Vector3(low.x,  high.y, low.z ).applyMatrix4(localToView),
            new Vector3(low.x,  high.y, high.z).applyMatrix4(localToView),
            new Vector3(low.x,  low.y,  high.z).applyMatrix4(localToView),
            new Vector3(high.x, low.y,  high.z).applyMatrix4(localToView),
            new Vector3(high.x, high.y, high.z).applyMatrix4(localToView),
        ];

        // Instantly discard if a vertex is behind the camera,
        //  otherwise convert vertices to clip space
        verts.map((e) => {
            if (e.z < 0)
                return false;
            else
                e.applyMatrix4(this.viewToClip);
        });
        
        const lines = [
            [verts[0], verts[1]],
            [verts[0], verts[3]],
            [verts[0], verts[5]],
            [verts[1], verts[2]],
            [verts[2], verts[3]],
            [verts[2], verts[7]],
            [verts[3], verts[4]],
            [verts[4], verts[5]],
            [verts[4], verts[7]],
            [verts[1], verts[6]],
            [verts[5], verts[6]],
            [verts[6], verts[7]]
        ];

        const radius = camera.getCamera().near * Math.tan(camera.getLight().angle);

        var uVec = new Vector3();

        // Calculate intersection for each line
        for (var i = 0; i < lines.length; i++)
            if (this.lineCircleIntersection(lines[i][0], 
                uVec.subVectors(lines[i][1], lines[i][0]),
                radius))
                return true;
            
        return false;
    }

    lineCircleIntersection(p, u, r)
    {
        const a = u.x * u.x + u.y * u.y;
        const b = 2 * (p.x * u.x + p.y * u.y);
        const c = p.x * p.x + p.y * p.y - r * r;

        const delta = b * b - 4 * a * c;

        if (delta > 0)
        {
            const l1 = (-b + Math.sqrt(delta)) / (2 * a);
            const l2 = (-b - Math.sqrt(delta)) / (2 * a);

            if ((l1 >= 0 && l1 <= 1) || (l2 >= 0 && l2 <= 1))
                return true;
        }
        else if (delta == 0)
        {
            const l = -b / (2 * a);

            if (l >= 0 && l <= 1)
                return true;
        }

        return new Vector2(p.x, p.y).length() <= r;
    }

    isObserved() { return this.observed; }

    getObject() { return this.object; }
}