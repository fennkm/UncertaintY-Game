"use strict";

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Interactable } from './Interactable.js';
import { QuantumGroup } from './QuantumGroup.js';
import { Camera } from './Camera.js';
import { Level } from './Level.js';

export class LevelLoader
{
    scene;
    loader;
    levels;

    constructor(scene)
    {
        this.scene = scene;
        this.loader = new GLTFLoader();
        this.levels = [];
    }

    loadLevel(levelNum, callback)
    {
        while (this.levels.length < levelNum - 1) this.levels.push(null);

        const loadSizes = [161974288];

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
				console.log(Math.trunc((xhr.loaded * 100) / loadSizes[levelNum - 1]) + "% loaded");
			},
			(error) => {
				console.log(error);
			}
		);
    }

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
                    0.3
                )
            );
        
            cameras.push(
                new Camera(
                    sceneCameras[1], 
                    cameraPitchControllers[1],
                    cameraYawControllers[1],
                    [[10, -120], [10, -180], [45, -180], [45, -120]],
                    Math.PI / 24,
                    0.3
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

    getLevel(levelNum) { return this.levels[levelNum - 1]; }

    getLevels() { return this.levels; }
}