"use strict";

import * as THREE from 'three';
import { Vector3 } from 'three';
import { MeshLine, MeshLineMaterial } from 'three.meshline';

export class Laser
{
    laser;
    laserLight;

    clock;

    active;
    laserAnimValues =   [false, true, false, true, false, true, false, true];
    lightAnimValues =   [    0,    5,     0,    5,     0,    5,     0,    5];
    animTimes =         [  0.0,  1.5,  1.55,  1.65,  1.7,  2.2,   5.2,  6.2];
    lightFlickerAnimValues = [10,    12];
    lightFlickerAnimTimes =  [0,   0.02];
    laserAnimMixer;
    lightAnimMixer;
    laserAnimAction;
    lightAnimAction;
    lightFlickerAnimAction

    currentCallback;
    visible;

    constructor(scene)
    {
        this.scene = scene;

        const laserMaterial = new MeshLineMaterial({ color: 0xff0000, lineWidth: 0.1, side: THREE.DoubleSide });
        const laserLine = new MeshLine();
        this.laser = new THREE.Mesh(laserLine, laserMaterial);
        this.laser.visible = false;
        scene.add(this.laser);

        this.laserLight = new THREE.PointLight();
        this.laserLight.distance = 10;
        this.laserLight.intensity = 0;
        this.laserLight.color = new THREE.Color(1, 0, 0);
        this.laserLight.castShadow = true;
        scene.add(this.laserLight);

        this.clock = new THREE.Clock();

        const laserKeyFrames = new THREE.BooleanKeyframeTrack(".visible", this.animTimes, this.laserAnimValues, THREE.InterpolateDiscrete);
        const lightKeyFrames = new THREE.NumberKeyframeTrack(".intensity", this.animTimes, this.lightAnimValues, THREE.InterpolateDiscrete);
        const lightFlickerKeyFrames = new THREE.NumberKeyframeTrack(".distance", this.lightFlickerAnimTimes, this.lightFlickerAnimValues, THREE.InterpolateLinear)

        const laserClip = new THREE.AnimationClip("fireLaser", -1, [laserKeyFrames]);
        const lightClip = new THREE.AnimationClip("fireLaser", -1, [lightKeyFrames]);
        const flickerClip = new THREE.AnimationClip("laserFlicker", -1, [lightFlickerKeyFrames]);
        
        this.laserAnimMixer = new THREE.AnimationMixer(this.laser);
        this.lightAnimMixer = new THREE.AnimationMixer(this.laserLight);
        
        this.laserAnimAction = this.laserAnimMixer.clipAction(laserClip);
        this.laserAnimAction.setLoop(THREE.LoopOnce, 1);

        this.lightAnimAction = this.lightAnimMixer.clipAction(lightClip);
        this.lightAnimAction.setLoop(THREE.LoopOnce, 1);

        this.lightFlickerAnimAction = this.lightAnimMixer.clipAction(flickerClip);
    }

    update()
    {
        const delta = this.clock.getDelta();
        
        this.laserAnimMixer.update(delta);
        this.lightAnimMixer.update(delta);
    }

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
            
            this.laserLight.position.set(lightPoint.x, lightPoint.y, lightPoint.z);
            
            this.currentCallback = () => { this.active = false; this.lightFlickerAnimAction.stop(); callback(); };
            this.laserAnimMixer.addEventListener("finished", this.currentCallback);

            this.laserAnimAction.reset();
            this.lightAnimAction.reset();
            
            this.lightAnimAction.play();
            this.lightFlickerAnimAction.play();
            this.laserAnimAction.play();
        }
    }

    isActive() { return this.active; }
}