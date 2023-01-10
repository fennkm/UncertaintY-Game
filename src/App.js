"use strict";

import * as THREE from 'three';
import { Vector3, Vector2, Box3Helper, Matrix4 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { Interactable } from './Interactable.js';
import { QuantumGroup } from './QuantumGroup.js';
import { Laser } from './Laser.js';
import { Camera } from './Camera.js';
import { RenderManager } from './RenderManager.js';

let scene, loader;
let renderManager;
let activeCamera, camera, cameras, cameraPitchControllers, cameraYawControllers, debugCam;
let ambLight;
let controls, clock;
let pointer, raycaster, laser, selection;
let interactables, quantumGroups;
let visibleObjs, aiming;

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

		cameras = [];
		cameraPitchControllers = [];
		cameraYawControllers = [];

		interactables = [];

		const quantumObjs = [];
		quantumGroups = [];

		loader.load(
			'../assets/models/room1.glb',
			(gltf) => {
				scene.add(gltf.scene);

				gltf.scene.updateWorldMatrix(false, true);
				
				gltf.scene.traverse((e) => {
					
					e.castShadow = true;
					e.receiveShadow = true;

					if (e.type == "PerspectiveCamera")
						cameras.push(e);
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

						interactables.push(new Interactable(e, boundingBox, -1));

						const temp = new Box3Helper(boundingBox);
						scene.add(temp);
					}
					else if (e.name.substring(0, 2) == "Q-")
					{
						const boundingBox = new THREE.Box3();
						boundingBox.setFromObject(e, true);

						const groupNum = e.name.substring(2, 3)
						const quantumObj = new Interactable(e, boundingBox, groupNum)

						interactables.push(quantumObj);

						while (quantumObjs.length <= groupNum)
							quantumObjs.push([]);

						quantumObjs[groupNum].push(quantumObj);

						const temp = new Box3Helper(boundingBox, new THREE.Color(0xff00000));
						scene.add(temp);
					}
				});

				for (var i = 0; i < quantumObjs.length; i++)
					quantumGroups.push(new QuantumGroup(quantumObjs[i]));

				onFinishLoad();
			},
			(xhr) => {
				console.log(Math.trunc((xhr.loaded * 100) / 161974396) + "% loaded");
			},
			(error) => {
				console.log(error);
			}
		);
	}
}

function onFinishLoad()
{

	camera = new Camera(
		scene, 
		cameras[0], 
		cameraPitchControllers[0],
		cameraYawControllers[0],
		[[10, -5], [10, -90], [35, -90], [35, -5]],
		Math.PI / 24,
		0.3
	);

	aiming = false;
	
	debugCam = new THREE.PerspectiveCamera(45, 2, 0.1, 10000);
	debugCam.position.set(0, 5, 0);

	activeCamera = (debug ? debugCam : camera.getCamera());

	const canvas = document.getElementById("gl-canvas");
	renderManager = new RenderManager(scene, canvas, activeCamera);

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

	helpers = [new THREE.SpotLightHelper(camera.light), new THREE.SpotLightHelper(camera.innerLight), new THREE.CameraHelper(camera.camera), new THREE.PointLightHelper(laser.laserLight)];
	
	helpers.map((e) => { scene.add(e); });

	if (!debug)
		helpers.map(function(e) { e.visible = false; });

	requestAnimationFrame(render);
}

function onWindowResize()
{
    const aspect = window.innerWidth / window.innerHeight;

    camera.getCamera().aspect = aspect;
    debugCam.aspect = aspect;
    camera.getCamera().updateProjectionMatrix();
    debugCam.updateProjectionMatrix();

    renderManager.setRenderSize(window.innerWidth, window.innerHeight);
}

function render() 
{
    const delta = clock.getDelta()
    controls.update(delta);

    laser.update();
    camera.update();
	interactables.map(e => e.update(camera));
	quantumGroups.map(e => e.update());

    raycaster.setFromCamera(pointer, activeCamera);

    const intersects = raycaster.intersectObjects(interactables.map(e => e.getObject()));

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
    if (selection != null && !laser.isActive() && !camera.isAnimating() && aiming)
    {
        const obj = selection.object;
        const objPos = getWorldPosition(obj);

        // Source of beam must be slightly offset from underneath
        //  the camera FOR SOME REASON otherwise it doesn't display
        const source = new Vector3(0, -0.1, -0.1);
        camera.getLight().localToWorld(source);
        
        const dir = new Vector3();
        dir.subVectors(objPos, source).normalize();
        raycaster.set(source, dir);

        const hitPoint = selection.point;
        
        camera.lightOff(() => { 
            laser.fire(source, hitPoint, () => {
                camera.lightOn(() => { 
					aiming = false;
                    camera.setMoving(true); 
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
			camera.setMoving(true);
		}
		else
		{
			aiming = true;
			camera.setMoving(false);
		}
	}
    else if (keyCode == 113) // F2 key
    {
        if (debug)
        {
            activeCamera = camera.camera;
            debug = false;
            helpers.map(function(e) { e.visible = false; });
            ambLight.intensity = 0;

			renderManager.setCamera(activeCamera);
			renderManager.setScreenFX(true);
        }
        else
        {
            activeCamera = debugCam;
            debug = true;
            helpers.map(function(e) { e.visible = true; });
            ambLight.intensity = 0.5;

			renderManager.setCamera(activeCamera);
			renderManager.setScreenFX(false);
        }
    }
	else if (keyCode == 115)
	{
		renderManager.setScreenFX(!renderManager.screenFXActive);
	}
}

function getWorldPosition(obj)
{
    return obj.localToWorld(new Vector3(0, 0, 0));
}

export default App;