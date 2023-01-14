"use strict";

import * as THREE from 'three';

export class AudioManager
{
    soundOffBtn;
    soundOnBtn;

    soundOn;
    listener;

    bgSound;
    clickSound;
    hoverSound;
    cameraStopSound;
    cameraMotorSound;

    constructor(scene)
    {
        this.scene = scene;
    }

    initialise()
    {
        this.listener = new THREE.AudioListener();
        this.scene.add(this.listener);

        this.bgSound = new THREE.Audio(this.listener);
        this.clickSound = new THREE.Audio(this.listener);
        this.hoverSound = new THREE.Audio(this.listener);
        this.cameraStopSound = new THREE.Audio(this.listener);
        this.cameraMotorSound = new THREE.Audio(this.listener);

        const audioLoader = new THREE.AudioLoader();

        audioLoader.load("../assets/audio/ambient_hum.wav", (buffer) => {
            this.bgSound.setBuffer(buffer);
            this.bgSound.setLoop(true);
            this.bgSound.play();
        });

        audioLoader.load("../assets/audio/click.wav", (buffer) => {
            this.clickSound.setBuffer(buffer);
            this.clickSound.isPlaying = false;
        });

        audioLoader.load("../assets/audio/hover.wav", (buffer) => {
            this.hoverSound.setBuffer(buffer);
            this.hoverSound.isPlaying = false;
        });

        audioLoader.load("../assets/audio/camera_stop.wav", (buffer) => {
            this.cameraStopSound.setBuffer(buffer);
            this.cameraStopSound.isPlaying = false;
        });

        audioLoader.load("../assets/audio/camera_motor.wav", (buffer) => {
            this.cameraMotorSound.setBuffer(buffer);
            this.cameraMotorSound.setLoop(true);
            this.cameraMotorSound.isPlaying = false;
        });
    }

    playHoverSound(callback)
    {
        if (this.hoverSound != null)
        {
            this.hoverSound.onEnded = () => {
                this.hoverSound.isPlaying = false;
                callback();
            };

            this.hoverSound.play();
        }
        else
            callback();
    }

    playClickSound(callback)
    {
        if (this.clickSound != null)
        {
            this.clickSound.onEnded = () => {
                this.clickSound.isPlaying = false;
                callback();
            };
            
            this.clickSound.play();
        }
        else
            callback();
    }

    playCameraStopSound(callback)
    {
        if (this.cameraStopSound != null)
        {
            this.cameraStopSound.onEnded = () => {
                this.cameraStopSound.isPlaying = false;
                callback();
            };
            
            this.cameraStopSound.play();
        }
        else
            callback();
    }

    setCameraMotorSound(enabled)
    {
        if (this.cameraMotorSound != null)
        {
            if (enabled)
                this.cameraMotorSound.play();
            else
                this.cameraMotorSound.stop();
        }
    }

    setSound(val)
    {
        if (this.listener == null)
            this.initialise();

        this.soundOn = val;

        if (this.soundOn)
        {
            this.bgSound.setVolume(0.25);
            this.clickSound.setVolume(1);
            this.hoverSound.setVolume(1);
            this.cameraStopSound.setVolume(0.4);
            this.cameraMotorSound.setVolume(0.3);
        }
        else
        {
            this.bgSound.setVolume(0);
            this.clickSound.setVolume(0);
            this.hoverSound.setVolume(0);
            this.cameraStopSound.setVolume(0);
            this.cameraMotorSound.setVolume(0);
        }
    }
}