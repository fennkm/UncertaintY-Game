"use strict";

import * as THREE from 'three';
import { Object3D, Vector3 } from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';

/**
 * Laser fired by the user to destroy objects
 * 
 * @param scene the scene to put the laser in
 */
export class Laser
{
    laser;
    laserLight;
    laserPointer;
    laserPointerTarget;

    clock;

    active;
    laserAnimValues =   [false, true, false, true, false, true, false, false];
    lightAnimValues =   [    0,    10,     0,    10,     0,    10,     0,    0];
    animTimes =         [  0.0,  1.5,  1.55,  1.65,  1.7,  2.2,   5.2,  6.2];
    lightFlickerAnimValues = [10,    11];
    lightFlickerAnimTimes =  [0,   0.02];
    laserAnimMixer;
    lightAnimMixer;
    laserAnimAction;
    lightAnimAction;
    lightFlickerAnimAction;

    currentCallback;
    visible;

    constructor(scene)
    {
        this.scene = scene;

        const laserMaterial = new MeshLineMaterial({ color: 0xff0000, lineWidth: 0.05, side: THREE.DoubleSide });
        this.laser = new THREE.Mesh(new MeshLine(), laserMaterial);
        this.laser.visible = false;
        scene.add(this.laser);

        this.laserLight = new THREE.PointLight();
        this.laserLight.distance = 10;
        this.laserLight.intensity = 0;
        this.laserLight.decay = 10;
        this.laserLight.color = new THREE.Color(1, 0, 0);
        this.laserLight.castShadow = true;
        scene.add(this.laserLight);

        this.laserPointer = new THREE.SpotLight(0xff0000, 0, undefined, Math.PI / 24);

        this.laserPointer.intensity = 0;
        this.laserPointer.castShadow = true;
    
        this.laserPointer.shadow.mapSize.width = 1024;
        this.laserPointer.shadow.mapSize.height = 1024;
    
        this.laserPointer.shadow.camera.near = 1;
        this.laserPointer.shadow.camera.far = 1000;
    
        this.laserPointer.shadow.camera.fov = 8;

        this.laserPointerTarget = new Object3D();

        this.laserPointer.target = this.laserPointerTarget;

        scene.add(this.laserPointer);
        scene.add(this.laserPointerTarget);

        this.clock = new THREE.Clock();

        const laserKeyFrames = new THREE.BooleanKeyframeTrack(".visible", this.animTimes, this.laserAnimValues, THREE.InterpolateDiscrete);
        const lightKeyFrames = new THREE.NumberKeyframeTrack(".intensity", this.animTimes, this.lightAnimValues, THREE.InterpolateDiscrete);
        const lightFlickerKeyFrames = new THREE.NumberKeyframeTrack(".distance", this.lightFlickerAnimTimes, this.lightFlickerAnimValues, THREE.InterpolateLinear);
    
        const laserClip = new THREE.AnimationClip("fireLaser", -1, [laserKeyFrames]);
        const lightClip = new THREE.AnimationClip("laserLight", -1, [lightKeyFrames]);
        const flickerClip = new THREE.AnimationClip("laserFlicker", -1, [lightFlickerKeyFrames]);
        
        this.laserAnimMixer = new THREE.AnimationMixer(this.laser);
        this.lightAnimMixer = new THREE.AnimationMixer(this.laserLight);
        
        this.laserAnimAction = this.laserAnimMixer.clipAction(laserClip);
        this.laserAnimAction.setLoop(THREE.LoopOnce, 1);

        this.lightAnimAction = this.lightAnimMixer.clipAction(lightClip);
        this.lightAnimAction.setLoop(THREE.LoopOnce, 1);

        this.lightFlickerAnimAction = this.lightAnimMixer.clipAction(flickerClip);
    }

    /**
     * Run every frame to update the laser animation
     * 
     * @param delta time passed since last update in seconds
     */
    update(delta)
    {
        this.laserAnimMixer.update(delta);
        this.lightAnimMixer.update(delta);
    }

    /**
     * Plays the fire animation of the laser
     * 
     * @param sourcePos position laser is fired from
     * @param targetPos position laser hits
     * @param callback called when animation finished playing
     */
    fire(sourcePos, targetPos, callback)
    {
        if (!this.active)
        {
            this.laserAnimMixer.removeEventListener("finished", this.currentCallback);
            
            this.active = true;
            
            this.laser.geometry.setPoints([targetPos, sourcePos]);
            this.laser.geometry.computeBoundingSphere();
            
            const dir = new Vector3();
            dir.subVectors(targetPos, sourcePos).normalize();
            
            const lightPoint = new Vector3();
            lightPoint.subVectors(targetPos, dir.clone().multiplyScalar(0.5));

            const pointerPoint = new Vector3();
            pointerPoint.subVectors(targetPos, dir.clone().multiplyScalar(2));
            
            this.laserLight.position.set(lightPoint.x, lightPoint.y, lightPoint.z);
            this.laserPointer.position.set(lightPoint.x, lightPoint.y, lightPoint.z);
            this.laserPointerTarget.position.set(targetPos.x, targetPos.y, targetPos.z);

            this.laserPointer.intensity = 5;
            
            this.currentCallback = () => { this.active = false; this.laserPointer.intensity = 0; this.lightFlickerAnimAction.stop(); callback(); };
            this.laserAnimMixer.addEventListener("finished", this.currentCallback);

            this.laserAnimAction.reset();
            this.lightAnimAction.reset();
            
            this.lightAnimAction.play();
            this.lightFlickerAnimAction.play();
            this.laserAnimAction.play();
        }
    }

    /**
     * Is the laser playing its fire animation 
     * 
     * @returns true if the animation is playing
     */
    isActive() { return this.active; }
}