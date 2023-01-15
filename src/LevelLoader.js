"use strict";

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Interactable } from './Interactable.js';
import { QuantumGroup } from './QuantumGroup.js';
import { Camera } from './Camera.js';
import { Level } from './Level.js';

/**
 * Loads levels from a file and parses them into level objects
 * 
 * @param scene the scene to load the levels into
 * @param audioManager the audioManger in the scene
 */
export class LevelLoader
{
    scene;
    audioManager;
    loader;
    levels;

    constructor(scene, audioManager)
    {
        this.scene = scene;
        this.audioManager = audioManager;
        this.loader = new GLTFLoader();
        this.levels = [];
    }

    /**
     * Loads a level from a file in /assets/models/ called room[num].glb
     * 
     * @param levelNum room number to load e.g. room1.glb, room2.glb
     * @param progressAdd how much loading has already progressed (0-1)
     * @param progressMul how much of the total loading this level represents (0-1)
     * @param callback called when room is finished loading
     */
    loadLevel(levelNum, progressAdd, progressMul, uiManager, callback)
    {
        while (this.levels.length < levelNum - 1) this.levels.push(null);

        const loadSizes = [147151252, 118362444];

        if (levelNum > loadSizes.length)
            console.error("No load size defined for level " + levelNum);

        this.loader.load(
			"../assets/models/room" + levelNum + ".glb",
			(gltf) => {
                this.scene.add(gltf.scene);
                gltf.scene.visible = false;
				this.processLevel(levelNum, gltf);
                callback();
			},
			(xhr) => {
                uiManager.setLoadingProgress(progressAdd + (xhr.loaded / loadSizes[levelNum - 1]) * progressMul);
				console.log(Math.trunc((xhr.loaded * 100) / loadSizes[levelNum - 1]) + "% loaded");
			},
			(error) => {
				console.log(error);
			}
		);
    }

    /**
     * Processes a level into a level object
     * 
     * @param levelNum level number to store as
     * @param gltf loaded gltf object to parse
     */
    processLevel(levelNum, gltf)
    {
        let levelScene;
        let cameras;
        let sceneCameras;
        let cameraPitchControllers;
        let cameraYawControllers;
    
        let interactables;
        let interactableMap;
        let quantumGroups;
    
        levelScene = gltf.scene;
        sceneCameras = [];
        cameraPitchControllers = []
        cameraYawControllers = [];
        interactables = [];
        interactableMap = {};
        quantumGroups = [];

        cameras = [];
    
        const quantumObjs = [];
    
        var helpers = [];
    
        levelScene.updateWorldMatrix(false, true);
        
        levelScene.traverse((e) => processObj(e));
    
        for (var i = 0; i < quantumObjs.length; i++)
            quantumGroups.push(new QuantumGroup(quantumObjs[i]));
    
        if (levelNum == 1)
        {
            cameras.push(
                new Camera(
                    sceneCameras[0], 
                    cameraPitchControllers[0],
                    cameraYawControllers[0],
                    [[10, -5], [10, -90], [35, -90], [35, -5]],
                    Math.PI / 24,
                    Math.PI / 12,
                    0.7,
                    this.audioManager
                )
            );
        
            cameras.push(
                new Camera(
                    sceneCameras[1], 
                    cameraPitchControllers[1],
                    cameraYawControllers[1],
                    [[10, -120], [10, -180], [45, -180], [45, -120]],
                    Math.PI / 24,
                    Math.PI / 12,
                    0.7,
                    this.audioManager
                )
            );
        }
        else if (levelNum == 2)
        {
            cameras.push(
                new Camera(
                    sceneCameras[0], 
                    cameraPitchControllers[0],
                    cameraYawControllers[0],
                    [[10, -120], [10, -180], [35, -180], [35, -120]],
                    Math.PI / 24,
                    Math.PI / 12,
                    0.7,
                    this.audioManager
                )
            );
        
            cameras.push(
                new Camera(
                    sceneCameras[1], 
                    cameraPitchControllers[1],
                    cameraYawControllers[1],
                    [[10, 0], [10, -140], [45, -140], [45, 0]],
                    Math.PI / 24,
                    Math.PI / 12,
                    0.7,
                    this.audioManager
                )
            );
        
            cameras.push(
                new Camera(
                    sceneCameras[2], 
                    cameraPitchControllers[2],
                    cameraYawControllers[2],
                    [[10, 0], [10, -140], [45, -140], [45, 0]],
                    Math.PI / 24,
                    Math.PI / 10,
                    0.7,
                    this.audioManager
                )
            );
        }
        else
        {
            console.error("No camera setup has been defined for level " + levelNum);
        }
    
        cameras.map((e) => { e.setActive(false); });
    
        cameras.map((e) => {
            helpers.push(new THREE.SpotLightHelper(e.getLight()));
            helpers.push(new THREE.CameraHelper(e.getCamera()));
        });

        helpers.map((e) => { levelScene.add(e); });
        
        this.levels[levelNum - 1] = new Level(
            levelScene,
            cameras,
            interactables,
            interactableMap,
            quantumGroups,
            helpers
        );
    
        function processObj(obj)
        {
            obj.castShadow = true;
            obj.receiveShadow = true;
    
            if (obj.type == "PerspectiveCamera")
                sceneCameras.push(obj);
            if (obj.type == "Mesh")
            {
                obj.material.metalness = 0;
                obj.material.metalnessMap = null;
            }
            if (obj.name.substring(0, 3) == "CP-")
                cameraPitchControllers.push(obj);
            else if (obj.name.substring(0, 3) == "CY-")
                cameraYawControllers.push(obj);
            else if (obj.name.substring(0, 3) == "LO-")
                obj.material.emissiveIntensity = 0;
            else if (obj.name.substring(0, 2) == "O-")
            {
                var boundingBox = new THREE.Box3();
                boundingBox.setFromObject(obj, true);
                
                const boxHelper = new THREE.Box3Helper(boundingBox, new THREE.Color(0xffff00));
                helpers.push(boxHelper);
                levelScene.add(boxHelper);
                
                const item = new Interactable(obj, boundingBox, -1);
                interactables.push(item);
                interactableMap[obj.name] = item;
            }
            else if (obj.name.substring(0, 2) == "Q-")
            {
                const boundingBox = new THREE.Box3();
                boundingBox.setFromObject(obj, true);
                
                const boxHelper = new THREE.Box3Helper(boundingBox, new THREE.Color(0xff0000));
                helpers.push(boxHelper)
                levelScene.add(boxHelper);
    
                const groupNum = parseInt(obj.name.substring(2, 3));
                const quantumObj = new Interactable(obj, boundingBox, groupNum)
    
                interactables.push(quantumObj);
                interactableMap[obj.name] = quantumObj;
                
                while (quantumObjs.length <= groupNum)
                quantumObjs.push([]);
                
                quantumObjs[groupNum].push(quantumObj);
            }
        }
    }

    /**
     * Gets a loaded level object
     * 
     * @param levelNum level number to fetch, must have been loaded first
     * @returns level object
     */
    getLevel(levelNum) { return this.levels[levelNum - 1]; }

    /**
     * Get list of all levels currently loaded
     * 
     * @returns list of level objects
     */
    getLevels() { return this.levels; }
}