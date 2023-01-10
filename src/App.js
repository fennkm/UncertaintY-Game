"use strict";

import * as THREE from 'three';
import { Vector3, Vector2, ArcCurve } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { Interactable } from './Interactable.js';
import { QuantumGroup } from './QuantumGroup.js';
import { Laser } from './Laser.js';
import { Camera } from './Camera.js';
import { RenderManager } from './RenderManager.js';

let scene, loader;
let renderManager;
let viewingCamera, currentCamera, cameras, sceneCameras, cameraPitchControllers, cameraYawControllers, debugCam;
let ambLight;
let controls, clock;
let pointer, raycaster, laser, selection;
let interactables, interactableMap, quantumGroups;
let aiming, score;
let room1;

var debug = false;
var helpers;

class App 
{
	init() 
	{
		scene = new THREE.Scene();
		scene.background = new THREE.Color('black');

		loader  = new GLTFLoader();

		clock = new THREE.Clock();

		raycaster = new THREE.Raycaster();

		sceneCameras = [];
		cameraPitchControllers = [];
		cameraYawControllers = [];

		interactables = [];
		interactableMap = {};
		score = 0;

		const quantumObjs = [];
		quantumGroups = [];

		helpers = [];

		loader.load(
			'../assets/models/room1.glb',
			(gltf) => {
				scene.add(gltf.scene);

				gltf.scene.updateWorldMatrix(false, true);
				
				gltf.scene.traverse((e) => {

					e.castShadow = true;
					e.receiveShadow = true;

					if (e.type == "PerspectiveCamera")
						sceneCameras.push(e);
					if (e.type == "Mesh")
					{
						e.material.metalness = 0;
						e.material.metalnessMap = null;
					}
					if (e.name.substring(0, 3) == "CP-")
						cameraPitchControllers.push(e);
					else if (e.name.substring(0, 3) == "CY-")
						cameraYawControllers.push(e);
					else if (e.name.substring(0, 3) == "LO-")
						e.material.emissiveIntensity = 0;
					else if (e.name.substring(0, 2) == "O-")
					{
						var boundingBox = new THREE.Box3();
						boundingBox.setFromObject(e, true);
						
						const boxHelper = new THREE.Box3Helper(boundingBox, new THREE.Color(0xffff00));
						helpers.push(boxHelper)
						scene.add(boxHelper);
						
						const obj = new Interactable(e, boundingBox, -1);
						interactables.push(obj);
						interactableMap[e.name] = obj;
					}
					else if (e.name.substring(0, 2) == "Q-")
					{
						const boundingBox = new THREE.Box3();
						boundingBox.setFromObject(e, true);
						
						const boxHelper = new THREE.Box3Helper(boundingBox, new THREE.Color(0xff0000));
						helpers.push(boxHelper)
						scene.add(boxHelper);

						const groupNum = parseInt(e.name.substring(2, 3));
						const quantumObj = new Interactable(e, boundingBox, groupNum)

						interactables.push(quantumObj);
						interactableMap[e.name] = quantumObj;
						
						while (quantumObjs.length <= groupNum)
						quantumObjs.push([]);
						
						quantumObjs[groupNum].push(quantumObj);
					}
				});
				room1 = gltf.scene;
				room1.visible = false;

				for (var i = 0; i < quantumObjs.length; i++)
					quantumGroups.push(new QuantumGroup(quantumObjs[i]));

				onFinishLoad();
			},
			(xhr) => {
				console.log(Math.trunc((xhr.loaded * 100) / 161974288) + "% loaded");
			},
			(error) => {
				console.log(error);
			}
		);
	}
}

function onFinishLoad()
{
	cameras = []
	cameras.push(
		new Camera(
			scene, 
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
			scene, 
			sceneCameras[1], 
			cameraPitchControllers[1],
			cameraYawControllers[1],
			[[10, -120], [10, -180], [45, -180], [45, -120]],
			Math.PI / 24,
			0.3
		)
	);

	cameras.map((e) => { e.setActive(false); });
	currentCamera = 0;

	aiming = false;
	
	debugCam = new THREE.PerspectiveCamera(45, 2, 0.1, 10000);
	debugCam.position.set(0, 5, 0);

	viewingCamera = (debug ? debugCam : cameras[currentCamera].getCamera());

	const canvas = document.getElementById("gl-canvas");
	renderManager = new RenderManager(scene, canvas, viewingCamera);

	renderManager.setScreenFX(!debug);
	
	createControls(debugCam, canvas);

	ambLight = new THREE.AmbientLight( 0x404040, (debug ? 0.5 : 0));
	scene.add(ambLight);

	laser = new Laser(scene);

	window.addEventListener("resize", onWindowResize);
	onWindowResize();
	
	pointer = new Vector2();
	window.addEventListener("pointermove", onPointerMove);
	window.addEventListener("pointerdown", onPointerDown);

	window.addEventListener("keydown", onKeyDown);

	helpers.push(new THREE.PointLightHelper(laser.laserLight));
	helpers.push(new THREE.SpotLightHelper(laser.laserPointer));

	cameras.map((e) => {
		helpers = helpers.concat([
			new THREE.SpotLightHelper(e.getLight()),
			new THREE.CameraHelper(e.getCamera())
		])
	});
	
	helpers.map((e) => { scene.add(e); });

	if (!debug)
		helpers.map(function(e) { e.visible = false; });

	requestAnimationFrame(render);
}

function onWindowResize()
{
    const aspect = window.innerWidth / window.innerHeight;

    cameras.map((e) => { e.getCamera().aspect = aspect; });
    debugCam.aspect = aspect;
    cameras.map((e) => { e.getCamera().updateProjectionMatrix(); });
    debugCam.updateProjectionMatrix();

    renderManager.setRenderSize(window.innerWidth, window.innerHeight);
}

function render() 
{
    const delta = clock.getDelta()
    controls.update(delta);

    laser.update();
    cameras.map(e => e.update());
	interactables.map(e => e.update(cameras[currentCamera]));
	quantumGroups.map(e => e.update());

	const observed = [];

	for (var i = 0; i < interactables.length; i++)
		if (interactables[i].isObserved() && interactables[i].getObject().visible)
			observed.push(interactables[i].getObject());

    raycaster.setFromCamera(pointer, viewingCamera);

    const intersects = raycaster.intersectObjects(observed);

    if (intersects[0] == null)
        selection = null;
    else
		selection = intersects[0];
    
    renderManager.render();
	
    requestAnimationFrame(render);
}

function createControls(camera, canvas) 
{
    controls = new FlyControls(camera, canvas);

    controls.dragToLook = true;
    controls.movementSpeed = 10;
    controls.rollSpeed = 0.5;
}

function onPointerMove(event) 
{
	pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
	pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;
}

function onPointerDown(event) 
{
    if (selection != null && !laser.isActive() && !cameras[currentCamera].isAnimating() && aiming)
    {
        var target = selection.object;
		
		while (interactableMap[target.name] == null)
		{
			target = target.parent;

			if (target == scene)
				return;
		}

		const obj = interactableMap[target.name];

        const objPos = getWorldPosition(obj.getObject());

        // Source of beam must be slightly offset from underneath
        //  the camera FOR SOME REASON otherwise it doesn't display
        const source = new Vector3(0, -0.1, -0.1);
        cameras[currentCamera].getLight().localToWorld(source);
        
        const dir = new Vector3();
        dir.subVectors(objPos, source).normalize();
        raycaster.set(source, dir);

        const hitPoint = selection.point;
        
		quantumGroups.map(e => e.setMoving(false));
        cameras[currentCamera].lightOff(() => { 
            laser.fire(source, hitPoint, () => {
				if (obj.getQuantumGroup() != -1)
				{
					quantumGroups[obj.getQuantumGroup()].setActive(false);
					console.log(++score);
					if (score == quantumGroups.length)
						console.log("You win!");
				}
				else
				{
					obj.getObject().visible = false;
					console.log("oops");
				}
                cameras[currentCamera].lightOn(() => { 
					aiming = false;
                    cameras[currentCamera].setMoving(true); 
					quantumGroups.map(e => e.setMoving(true));
                }); 
            }); 
        });
    }
}

function onKeyDown(event)
{
    var keyCode = event.which;
    
	if (keyCode == 32) // Space
	{
		if (aiming)
		{
			aiming = false;
			cameras[currentCamera].setMoving(true);
		}
		else
		{
			aiming = true;
			cameras[currentCamera].setMoving(false);
		}
	}
	else if (keyCode == 16) // shift key
    {
		cameras[currentCamera].setActive(false);
        currentCamera = (currentCamera + 1) % cameras.length;
		cameras[currentCamera].setActive(true);

		if (!debug)
		{
			viewingCamera = cameras[currentCamera].getCamera();
			renderManager.setCamera(viewingCamera);
		}
    }
    else if (keyCode == 113) // F2 key
    {
        if (debug)
        {
            viewingCamera = cameras[currentCamera].getCamera();
            debug = false;
            helpers.map(function(e) { e.visible = false; });
            ambLight.intensity = 0;

			renderManager.setCamera(viewingCamera);
			renderManager.setScreenFX(true);
        }
        else
        {
            viewingCamera = debugCam;
            debug = true;
            helpers.map(function(e) { e.visible = true; });
            ambLight.intensity = 0.5;

			renderManager.setCamera(viewingCamera);
			renderManager.setScreenFX(false);
        }
    }
	else if (keyCode = 115)
	{
		room1.visible = true;
		
		cameras[currentCamera].setActive(true);
	}
}

function getWorldPosition(obj)
{
    return obj.localToWorld(new Vector3(0, 0, 0));
}

export default App;