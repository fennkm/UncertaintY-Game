"use strict";

import * as THREE from 'three';
import { Vector3, Vector2 } from 'three';

/**
 * An object in the scene that can be shot with the laser
 * 
 * @param object the object to wrap
 * @param boundingBox the world-aligned bounding box of the attached object
 * @param quantumGroup -1 if the object is not quantum, otherwise the index of the quantum group it is a part of
 */
export class Interactable
{
    observed;
    object;
    boundingBox;

    invertZ;
    sceneToView;
    viewToClip;

    constructor(object, boundingBox, quantumGroup)
    {
        this.object = object;

        this.boundingBox = boundingBox;

        this.quantumGroup = quantumGroup;
        
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
            this.observed = this.boxConeIntersect(this.boundingBox, camera);
        else
            this.observed = false;
    }

    /**
     * Determines whether or not a bounding box is illuminated by a camera's spotlight.
     * NOTE: an object is considered invisible if any point is behind the spotlight, or it entirely encompasses is not edge intersections
     * 
     * @param boundingBox the bounding box to check intersection with
     * @param camera the camera whose light to check intersection with
     * @returns true if the bounding box is illuminated by the spotlight
     */
    boxConeIntersect(boundingBox, camera)
    {
        const viewBounds = boundingBox.clone().applyMatrix4(this.sceneToView);
        // Get vertices of bounding box
        const low = viewBounds.min;
        const high = viewBounds.max;

        const verts = [
            new Vector3(low.x,  low.y,  low.z ),
            new Vector3(high.x, low.y,  low.z ),
            new Vector3(high.x, high.y, low.z ),
            new Vector3(low.x,  high.y, low.z ),
            new Vector3(low.x,  high.y, high.z),
            new Vector3(low.x,  low.y,  high.z),
            new Vector3(high.x, low.y,  high.z),
            new Vector3(high.x, high.y, high.z),
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

    /**
     * Checks if a line intersects with a circle in 2D space
     * 
     * @param p the point the line starts from
     * @param u the vector of the point, so the endpoint is p + u
     * @param r the radius of the circle, centred at the origin
     * @returns true if the line intersects the circle
     */
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

    /**
     * Is this object illuminated by a light
     * 
     * @returns true if the object is observed
     */
    isObserved() { return this.observed; }

    /**
     * Get the object wrapped by this
     * 
     * @returns the three.js object
     */
    getObject() { return this.object; }

    /**
     * Get the quantum group this object is a part of
     * 
     * @returns -1 if this object is not part of a quantum group, otherwise the index of the group this object is in
     */
    getQuantumGroup() { return this.quantumGroup; }
}