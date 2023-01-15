"use strict";

import * as THREE from 'three';

/**
 * A security camera for levels, has a light and animation
 * 
 * @param camera the three.js camera object to wrap
 * @param pitchController the control point for pitch control
 * @param yawController the control point for yaw control
 * @param rotationValues an array of [pitch,yaw] values to transition through
 * @param rotationSpeed the speed of camera rotation in radians per second
 * @param lightAngle the angle of the spotlight attached
 * @param pauseLength how long the camera should pause for between rotation values
 */
export class Camera
{
    camera;
    cameraHolder;
    light;
    innerLight;

    audioManager;

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

    rotationAnimTimes;
    yawAnimMixer;
    pitchAnimMixer;
    yawAnimAction;
    pitchAnimAction;

    isActiveCam;
    isPanning;

    currentCallback;
    animating;

    constructor(camera, pitchController, yawController, rotationValues, rotationSpeed, lightAngle, pauseLength, audioManager)
    {
        this.camera = camera;
        this.audioManager = audioManager;

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

        const startPitch = new THREE.Quaternion();
        startPitch.setFromEuler(new THREE.Euler(0, yawAnimAngles[0], pitchAnimAngles[0], 'XYZ'));
        
        const startYaw = new THREE.Quaternion();
        startYaw.setFromEuler(new THREE.Euler(0, yawAnimAngles[0], 0, 'XYZ'));
        
        this.rotationAnimTimes = [0];

        var stopFrame = true;
        for (var i = 1; i < pitchAnimAngles.length; i++)
        {
            if (stopFrame)
                this.rotationAnimTimes.push(this.rotationAnimTimes[i - 1] + pauseLength);
            else
            {
                this.rotationAnimTimes.push(
                    this.rotationAnimTimes[i - 1] +
                    Math.max(
                        Math.abs(pitchAnimAngles[i] - pitchAnimAngles[i - 1]),
                        Math.abs(yawAnimAngles[i] - yawAnimAngles[i - 1])
                    ) / rotationSpeed
                );
            }
            stopFrame = !stopFrame;
        }

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

        this.light = new THREE.SpotLight( 0xddddff, 1, undefined, lightAngle, 0.2);
        this.light.position.set(0, -0.3, 0);
    
        this.light.castShadow = true;
    
        this.light.shadow.mapSize.width = 1024;
        this.light.shadow.mapSize.height = 1024;
    
        this.light.shadow.camera.near = 1;
        this.light.shadow.camera.far = 1000;
    
        this.light.shadow.camera.fov = camera.fov;
        this.light.shadow.radius = 10;

	    this.camera.add(this.light);

        this.innerLight = new THREE.SpotLight( 0xffffff, 2, undefined, lightAngle * 0.75, 0.6);
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

        const pitchKeyFrames = new THREE.QuaternionKeyframeTrack(".quaternion", this.rotationAnimTimes, pitchAnimValues, THREE.InterpolateLinear);
        const yawKeyFrames = new THREE.QuaternionKeyframeTrack(".quaternion", this.rotationAnimTimes, yawAnimValues, THREE.InterpolateLinear);
        
        const pitchClip = new THREE.AnimationClip("rotatePitch", -1, [pitchKeyFrames]);
        const yawClip = new THREE.AnimationClip("rotateYaw", -1, [yawKeyFrames]);

        this.pitchAnimMixer = new THREE.AnimationMixer(this.pitchController);
        this.yawAnimMixer = new THREE.AnimationMixer(this.yawController);
        
        this.pitchAnimAction = this.pitchAnimMixer.clipAction(pitchClip);
        this.yawAnimAction = this.pitchAnimMixer.clipAction(yawClip);

        this.clock = new THREE.Clock();

        this.pitchAnimAction.play();
        this.yawAnimAction.play();

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

    /**
     * Updates the camera animation and sound
     * 
     * @param isActiveCam is this camera rendering to the screen
     */
    update(isActiveCam)
    {
        const delta = this.clock.getDelta();

        this.lightAnimMixer.update(delta);
        this.innerLightAnimMixer.update(delta);
        
        this.pitchAnimMixer.update(delta);
        this.yawAnimMixer.update(delta);

        if (isActiveCam != this.isActiveCam)
        {
            this.isActiveCam = isActiveCam
            
            if (this.isActiveCam)
                this.isPanning = false;
        }

        if (this.isActiveCam && this.moving)
        {
            var animIndex = 0;
            const animDuration = this.rotationAnimTimes[this.rotationAnimTimes.length - 1]

            while (this.rotationAnimTimes[animIndex + 1] < this.pitchAnimAction.time % animDuration) animIndex++;

            if (animIndex % 2 == 0 && this.isPanning)
            {
                this.isPanning = false;
                this.audioManager.setCameraMotorSound(false);
                this.audioManager.playCameraStopSound(() => {});
            }
            else if (animIndex % 2 == 1 && !this.isPanning)
            {
                this.isPanning = true;
                this.audioManager.setCameraMotorSound(true);
            }
        }
    }
    
    /**
     * Plays the camera light on animation
     * 
     * @param callback called when animation is finished
     */
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
    
    /**
     * Plays the camera light off animation
     * 
     * @param callback called when animation is finished
     */
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

    /**
     * Sets the camera's movement and light
     * 
     * @param val turn camera off or on
     */
    setActive(val)
    {
        this.setMoving(val, false);
        this.setVisible(val);
    }

    /**
     * Starts or stops the camera's movement
     * 
     * @param isMoving start or stop the camera
     * @param playEffect play the stop sound effect
     */
    setMoving(isMoving, playEffect)
    {
        if (isMoving && !this.moving)
        {
            this.pitchAnimAction.paused = false;
            this.yawAnimAction.paused = false;
        }
        else if (!isMoving && this.moving)
        {
            this.pitchAnimAction.paused = true;
            this.yawAnimAction.paused = true;

            if (this.isActiveCam && this.isPanning)
            {
                this.isPanning = false;
                this.audioManager.setCameraMotorSound(false);
                if (playEffect)
                    this.audioManager.playCameraStopSound(() => {});
            }
        }

        this.moving = isMoving;
    }

    /**
     * Reset the camera to it's initial position in its animation
     */
    reset()
    {
        this.yawAnimMixer.time = 0;
        this.pitchAnimMixer.time = 0;
        this.yawAnimAction.time = 0;
        this.pitchAnimAction.time = 0;

        this.isPanning = false;
    }

    /**
     * Turn the camera's light on or off
     * 
     * @param val light on or off
     */
    setVisible(val)
    {
        this.light.intensity = (val ? 1 : 0);
        this.innerLight.intensity = (val ? 2 : 0);
    }

    /**
     * Is the camera's light on
     * 
     * @returns true is the light is on
     */
    getLightVisibility() { return this.light.intensity > 0; }

    /**
     * Is the camera going through a light on/off animation
     * 
     * @returns true if an animation is playing
     */
    isAnimating() { return this.animating; }

    /**
     * Gets the three.js camera object wrapped by this
     * 
     * @returns the camera object
     */
    getCamera() { return this.camera; }

    /**
     * Gets the spotlight object attached to this
     * 
     * @returns the spotlight object
     */
    getLight() { return this.light; }
}