"use strict";

import * as THREE from "three";

/**
 * Controls the ambient light in the rooms
 * 
 * @param scene the scene to add the light to
 */
export class LightController
{
    ambLight;

    lightOnAnimValues =      [  0,   2,   0,   2,   0,   2,   2];
    onAnimTimes =            [0.0, 1.0, 1.1, 1.2, 1.4, 1.6, 8.0];

    lightAnimMixer;
    lightOnAnimAction;

    animating;
    currentCallback;

    constructor(scene)
    {
        this.light = new THREE.PointLight(0x404040, 0);

        scene.add(this.light);

        const lightOnKeyFrames = new THREE.NumberKeyframeTrack(".intensity", this.onAnimTimes, this.lightOnAnimValues, THREE.InterpolateDiscrete);

        const lightOnClip = new THREE.AnimationClip("lightOn", -1, [lightOnKeyFrames]);
       
        this.lightAnimMixer = new THREE.AnimationMixer(this.light);
        
        this.lightOnAnimAction = this.lightAnimMixer.clipAction(lightOnClip);
        this.lightOnAnimAction.setLoop(THREE.LoopOnce, 1);

        this.animating = false;
    }

    /**
     * Updates the light animation
     * 
     * @param delta time since last frame in seconds
     */
    update(delta)
    {
        this.lightAnimMixer.update(delta);
    }
    
    /**
     * Plays the light on animation
     * 
     * @param callback called when animation is finished
     */
    lightOn(callback)
    {
        if (!this.animating)
        {
            this.lightAnimMixer.removeEventListener("finished", this.currentCallback);

            this.animating = true;
            
            this.currentCallback = () => { 
                callback();
            };

            this.lightAnimMixer.addEventListener("finished", this.currentCallback);

            this.lightOnAnimAction.reset();

            this.lightOnAnimAction.play();
        }
    }

    /**
     * Gets the three.js light object attached
     * 
     * @returns light object
     */
    getLight() { return this.light; }
}