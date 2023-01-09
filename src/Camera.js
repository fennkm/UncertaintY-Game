"use strict";

import * as THREE from 'three';
import { Vector3 } from 'three';

export class Camera
{
    camera;
    cameraHolder;
    light;
    innerLight;

    moving;

    clock;

    lightOnAnimValues =      [  0,   1,   0,   1,   0,   1,   1];
    innerLightOnAnimValues = [  0,   2,   0,   2,   0,   2,   2];
    onAnimTimes =            [0.0, 1.0, 1.1, 1.2, 1.4, 1.6, 2.0];
    lightOffAnimValues =      [  1,   0];
    innerLightOffAnimValues = [  2,   0];
    offAnimTimes =            [0.0, 0.6];
    lightAnimMixer;
    innerLightAnimMixer;
    lightOnAnimAction;
    lightOffAnimAction;
    innerLightOnAnimAction;
    innerLightOffAnimAction;

    yawAnimMixer;
    pitchAnimMixer;
    yawAnimAction;
    pitchAnimAction;

    currentCallback;
    animating;

    constructor(scene, camera, pitchController, yawController, rotationValues, rotationSpeed, pauseLength)
    {
        this.scene = scene;

        this.camera = camera;

        this.pitchController = pitchController;
        this.yawController = yawController;

        const pitchAnimAngles= [];
        const yawAnimAngles = []

        for (var i = 0; i < rotationValues.length; i++)
        {
            pitchAnimAngles.push(rotationValues[i][0] * Math.PI / 180);
            yawAnimAngles.push(rotationValues[i][1] * Math.PI / 180);

            pitchAnimAngles.push(rotationValues[i][0] * Math.PI / 180);
            yawAnimAngles.push(rotationValues[i][1] * Math.PI / 180);
        }

        pitchAnimAngles.push(rotationValues[0][0] * Math.PI / 180);
        yawAnimAngles.push(rotationValues[0][1] * Math.PI / 180);

        console.log(pitchAnimAngles);
        
        const rotationAnimTimes = [0];

        var stopFrame = true;
        for (var i = 1; i < pitchAnimAngles.length; i++)
        {
            if (stopFrame)
                rotationAnimTimes.push(rotationAnimTimes[i - 1] + pauseLength);
            else
            {
                rotationAnimTimes.push(
                    rotationAnimTimes[i - 1] +
                    Math.max(
                        Math.abs(pitchAnimAngles[i] - pitchAnimAngles[i - 1]),
                        Math.abs(yawAnimAngles[i] - yawAnimAngles[i - 1])
                    ) / rotationSpeed
                );
            }
            stopFrame = !stopFrame;
        }

        console.log(rotationAnimTimes);

        var pitchAnimValues = [];
        var yawAnimValues = [];

        for (var i = 0; i < pitchAnimAngles.length; i++)
        {
            const q1 = new THREE.Quaternion();
            q1.setFromEuler(new THREE.Euler(0, yawAnimAngles[i], pitchAnimAngles[i], 'XYZ'));
            pitchAnimValues = pitchAnimValues.concat(q1.toArray());
            
            const q2 = new THREE.Quaternion();
            q2.setFromEuler(new THREE.Euler(0, yawAnimAngles[i], 0, 'XYZ'));
            yawAnimValues = yawAnimValues.concat(q2.toArray());
        }

        this.light = new THREE.SpotLight( 0xddddff, 1, undefined, Math.PI / 12, 0.2);
        this.light.position.set(0, -0.3, 0);
    
        this.light.castShadow = true;
    
        this.light.shadow.mapSize.width = 1024;
        this.light.shadow.mapSize.height = 1024;
    
        this.light.shadow.camera.near = 1;
        this.light.shadow.camera.far = 1000;
    
        this.light.shadow.camera.fov = camera.fov;
        this.light.shadow.radius = 10;

	    this.camera.add(this.light);

        this.innerLight = new THREE.SpotLight( 0xffffff, 2, undefined, Math.PI / 16, 0.6);
        this.innerLight.position.set(0, 0, 0);

        this.innerLight.castShadow = true;
    
        this.innerLight.shadow.mapSize.width = 1024;
        this.innerLight.shadow.mapSize.height = 1024;
    
        this.innerLight.shadow.camera.near = 1;
        this.innerLight.shadow.camera.far = 1000;
    
        this.innerLight.shadow.camera.fov = camera.fov;
        this.innerLight.shadow.radius = 10;
        
        this.light.add(this.innerLight);

        const lightTarget = new THREE.Object3D();
        lightTarget.position.set(0, 0, -1);
        this.light.add(lightTarget);
        this.light.target = lightTarget;
        this.innerLight.target = lightTarget;

        this.moving = true;

        const pitchKeyFrames = new THREE.QuaternionKeyframeTrack(".quaternion", rotationAnimTimes, pitchAnimValues, THREE.InterpolateLinear);
        const yawKeyFrames = new THREE.QuaternionKeyframeTrack(".quaternion", rotationAnimTimes, yawAnimValues, THREE.InterpolateLinear);
        
        const pitchClip = new THREE.AnimationClip("rotatePitch", -1, [pitchKeyFrames]);
        const yawClip = new THREE.AnimationClip("rotateYaw", -1, [yawKeyFrames]);

        this.pitchAnimMixer = new THREE.AnimationMixer(this.pitchController);
        this.yawAnimMixer = new THREE.AnimationMixer(this.yawController);
        
        this.pitchAnimAction = this.pitchAnimMixer.clipAction(pitchClip);
        this.yawAnimAction = this.pitchAnimMixer.clipAction(yawClip);

        this.pitchAnimAction.play();
        this.yawAnimAction.play();

        this.clock = new THREE.Clock();

        this.animating = false;

        const lightOnKeyFrames = new THREE.NumberKeyframeTrack(".intensity", this.onAnimTimes, this.lightOnAnimValues, THREE.InterpolateDiscrete);
        const lightOffKeyFrames = new THREE.NumberKeyframeTrack(".intensity", this.offAnimTimes, this.lightOffAnimValues, THREE.InterpolateDiscrete);
        const innerLightOnKeyFrames = new THREE.NumberKeyframeTrack(".intensity", this.onAnimTimes, this.innerLightOnAnimValues, THREE.InterpolateDiscrete);
        const innerLightOffKeyFrames = new THREE.NumberKeyframeTrack(".intensity", this.offAnimTimes, this.innerLightOffAnimValues, THREE.InterpolateDiscrete);

        const lightOnClip = new THREE.AnimationClip("fireLaser", -1, [lightOnKeyFrames]);
        const lightOffClip = new THREE.AnimationClip("fireLaser", -1, [lightOffKeyFrames]);
        const innerLightOnClip = new THREE.AnimationClip("fireLaser", -1, [innerLightOnKeyFrames]);
        const innerLightOffClip = new THREE.AnimationClip("fireLaser", -1, [innerLightOffKeyFrames]);
        
        this.lightAnimMixer = new THREE.AnimationMixer(this.light);
        this.innerLightAnimMixer = new THREE.AnimationMixer(this.innerLight);
        
        this.lightOnAnimAction = this.lightAnimMixer.clipAction(lightOnClip);
        this.lightOnAnimAction.setLoop(THREE.LoopOnce, 1);
        this.innerLightOnAnimAction = this.innerLightAnimMixer.clipAction(innerLightOnClip);
        this.innerLightOnAnimAction.setLoop(THREE.LoopOnce, 1);

        this.lightOffAnimAction = this.lightAnimMixer.clipAction(lightOffClip);
        this.lightOffAnimAction.setLoop(THREE.LoopOnce, 1);
        this.innerLightOffAnimAction = this.innerLightAnimMixer.clipAction(innerLightOffClip);
        this.innerLightOffAnimAction.setLoop(THREE.LoopOnce, 1);
    }

    update()
    {
        const delta = this.clock.getDelta();

        this.lightAnimMixer.update(delta);
        this.innerLightAnimMixer.update(delta);
        
        this.pitchAnimMixer.update(delta);
        this.yawAnimMixer.update(delta);

        // if (this.moving)
        // {
        //     this.angleOffset += this.rotationDir * this.rotationSpeed * delta;

        //     if (Math.abs(this.angleOffset) >= this.fov / 2)
        //     {
        //         this.angleOffset = this.rotationDir * this.fov / 2;
        //         this.rotationDir *= -1;
        //     }

        //     this.yawController.rotation.set(0, this.centreAngle + this.angleOffset, 0);
        // }
    }
    
    lightOn(callback)
    {
        if (!this.animating)
        {
            this.lightAnimMixer.removeEventListener("finished", this.currentCallback);

            this.animating = true;
            
            this.currentCallback = () => { this.setVisible(true); this.animating = false; callback(); };
            this.lightAnimMixer.addEventListener("finished", this.currentCallback);

            this.lightOnAnimAction.reset();
            this.innerLightOnAnimAction.reset();

            this.lightOnAnimAction.play();
            this.innerLightOnAnimAction.play();
        }
    }

    lightOff(callback)
    {
        if (!this.animating)
        {
            this.lightAnimMixer.removeEventListener("finished", this.currentCallback);

            this.animating = true;
            
            this.currentCallback = () => { this.setVisible(false); this.animating = false; callback(); };
            this.lightAnimMixer.addEventListener("finished", this.currentCallback);

            this.lightOffAnimAction.reset();
            this.innerLightOffAnimAction.reset();

            this.lightOffAnimAction.play();
            this.innerLightOffAnimAction.play();
        }
    }

    setMoving(isMoving)
    {
        this.moving = isMoving;
    }

    setVisible(val)
    {
        this.light.intensity = (val ? 1 : 0);
        this.innerLight.intensity = (val ? 2 : 0);
    }

    getLightVisibility() { return this.light.intensity > 0; }

    isAnimating() { return this.animating; }

    getCamera() { return this.camera; }

    getLight() { return this.light; }
}