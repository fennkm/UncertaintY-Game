"use strict";

import * as THREE from 'three';

/**
 * Loads and plays audio tracks
 * 
 * @param scene the scene to play audio in
 */
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
    staticSound;
    laserFireSound;
    monsterScreamSound;
    monsterGrowlSound;

    disturbanceSounds;
    
    constructor(scene)
    {
        this.scene = scene;
    }

    /**
     * Sets up the audio system to start playing audio. (Note: must be called as part of a user interaction)
     */
    initialise()
    {
        this.listener = new THREE.AudioListener();
        this.scene.add(this.listener);

        this.bgSound = new THREE.Audio(this.listener);
        this.clickSound = new THREE.Audio(this.listener);
        this.hoverSound = new THREE.Audio(this.listener);
        this.cameraStopSound = new THREE.Audio(this.listener);
        this.cameraMotorSound = new THREE.Audio(this.listener);
        this.staticSound = new THREE.Audio(this.listener);
        this.laserFireSound = new THREE.Audio(this.listener);
        this.monsterScreamSound = new THREE.Audio(this.listener);
        this.monsterGrowlSound = new THREE.Audio(this.listener);
        this.steamHissSound = new THREE.Audio(this.listener);

        this.disturbanceSounds = [];
        for (var i = 0; i < 6; i++)
            this.disturbanceSounds.push(new THREE.Audio(this.listener));

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

        audioLoader.load("../assets/audio/camera_off.wav", (buffer) => {
            this.staticSound.setBuffer(buffer);
            this.staticSound.setLoop(true);
            this.staticSound.isPlaying = false;
        });

        audioLoader.load("../assets/audio/laser_fire.wav", (buffer) => {
            this.laserFireSound.setBuffer(buffer);
            this.laserFireSound.isPlaying = false;
        });

        audioLoader.load("../assets/audio/monster_scream.wav", (buffer) => {
            this.monsterScreamSound.setBuffer(buffer);
            this.monsterScreamSound.isPlaying = false;
        });

        audioLoader.load("../assets/audio/monster_growl.wav", (buffer) => {
            this.monsterGrowlSound.setBuffer(buffer);
            this.monsterGrowlSound.isPlaying = false;
        });

        for (var i = 0; i < this.disturbanceSounds.length; i++)
        {
            const k = i;
            audioLoader.load("../assets/audio/disturbance" + (k + 1) + ".wav", (buffer) => {
                this.disturbanceSounds[k].setBuffer(buffer);
                this.disturbanceSounds[k].isPlaying = false;
            });
        }
    }

    /**
     * Plays hover.wav
     * 
     * @param callback called when sound is finished playing
     */
    playHoverSound(callback)
    {
        this.playSoundSingle(this.hoverSound, callback);
    }

    /**
     * Plays click.wav
     * 
     * @param callback called when sound is finished playing
     */
    playClickSound(callback)
    {
        this.playSoundSingle(this.clickSound, callback);
    }

    /**
     * Plays camera_stop.wav
     * 
     * @param callback called when sound is finished playing
     */
    playCameraStopSound(callback)
    {
        this.playSoundSingle(this.cameraStopSound, callback);
    }

    /**
     * Plays laser_fire.wav
     * 
     * @param callback called when sound is finished playing
     */
    playLaserFireSound(callback)
    {
        this.playSoundSingle(this.laserFireSound, callback);
    }

    /**
     * Plays monster_scream.wav
     * 
     * @param callback called when sound is finished playing
     */
    playMonsterScreamSound(callback)
    {
        this.playSoundSingle(this.monsterScreamSound, callback);
    }

    /**
     * Plays monster_growl.wav
     * 
     * @param callback called when sound is finished playing
     */
    playMonsterGrowlSound(callback)
    {
        this.playSoundSingle(this.monsterGrowlSound, callback);
    }

    /**
     * Plays a random track titled disturbance[num].wav
     * 
     * @param callback called when sound is finished playing
     */
    playRandomDisturbance(callback)
    {
        this.playSoundSingle(this.disturbanceSounds[Math.floor(Math.random() * this.disturbanceSounds.length)], callback);
    }

    /**
     * Plays a single sound once
     * 
     * @param sound sound to play
     * @param callback called when sound is finished playing
     */
    playSoundSingle(sound, callback)
    {
        if (sound != null)
        {
            sound.onEnded = () => {
                sound.isPlaying = false;
                callback();
            };
            
            sound.play();
        }
        else
            callback();
    }

    /**
     * Turns camera_motor.wav on or off
     * 
     * @param enabled turn on or off
     */
    setCameraMotorSound(enabled)
    {
        this.setContinuousSound(this.cameraMotorSound, enabled)
    }

    /**
     * Turns static_sound.wav on or off
     * 
     * @param enabled turn on or off
     */
    setStaticSound(enabled)
    {
        this.setContinuousSound(this.staticSound, enabled)
    }

    /**
     * Turns a continuously looping sound on or off
     * 
     * @param enabled turn on or off
     */
    setContinuousSound(sound, enabled)
    {
        if (sound != null)
        {
            if (enabled)
                sound.play();
            else
                sound.stop();
        }
    }

    /**
     * Turns the volume of all sounds on or off
     * 
     * @param val turn on or off
     */
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
            this.laserFireSound.setVolume(0.6); 
            this.monsterScreamSound.setVolume(0.2);
            this.monsterGrowlSound.setVolume(1);

            this.disturbanceSounds.map((e) => { e.setVolume(0.6); });
        }
        else
        {
            this.bgSound.setVolume(0);
            this.clickSound.setVolume(0);
            this.hoverSound.setVolume(0);
            this.cameraStopSound.setVolume(0);
            this.cameraMotorSound.setVolume(0);
            this.laserFireSound.setVolume(0);
            this.monsterScreamSound.setVolume(0);
            this.monsterGrowlSound.setVolume(0);

            this.disturbanceSounds.map((e) => { e.setVolume(0); });
        }
    }

    /**
     * Gets whether or not the sound system is playing
     * 
     * @returns true if sound is on
     */
    getSoundOn() { return this.soundOn; }
}