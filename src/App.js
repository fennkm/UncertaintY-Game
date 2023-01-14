"use strict";

import * as THREE from 'three';
import { Vector3, Vector2 } from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { Laser } from './Laser.js';
import { LevelLoader } from './LevelLoader.js';
import { RenderManager } from './RenderManager.js';
import { UIManager } from './UIManager.js';

let scene, lvl, levelLoader, ambLight;
let renderManager, uiManager;
let viewingCamera, currentCamera, menuCam, debugCam;
let controls, clock;
let pointer, raycaster, laser, selection;
let aiming, lives, score, timeLeft, timerRunning;

var debug = false;
var helpers;

class App 
{
	init() 
	{
		const canvas = document.getElementById("gl-canvas");

		scene = new THREE.Scene();
		scene.background = new THREE.Color('black');

		clock = new THREE.Clock();

		raycaster = new THREE.Raycaster();

		debugCam = new THREE.PerspectiveCamera(45, 2, 0.1, 10000);
		debugCam.position.set(0, 5, 0);
		scene.add(debugCam);
		
		createControls(debugCam, canvas);

		menuCam = new THREE.PerspectiveCamera(45, 2, 0.1, 10000);
		scene.add(menuCam);

		viewingCamera = menuCam;//(debug ? debugCam : cameras[currentCamera].getCamera());
		renderManager = new RenderManager(scene, canvas, viewingCamera);

		renderManager.setScreenFX(!debug);

		ambLight = new THREE.AmbientLight( 0x404040, (debug ? 1 : 0));
		scene.add(ambLight);

		laser = new Laser(scene);
		
		pointer = new Vector2();
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerdown", onPointerDown);

		window.addEventListener("keydown", onKeyDown);

		helpers = [];

		helpers.push(new THREE.PointLightHelper(laser.laserLight));
		helpers.push(new THREE.SpotLightHelper(laser.laserPointer));
		scene.add(helpers[0]);
		scene.add(helpers[1]);

		helpers.push(new THREE.CameraHelper(menuCam));
		menuCam.add(helpers[2]);

		if (!debug)
			helpers.map((e) => { e.visible = false; });

		levelLoader = new LevelLoader(scene);
		levelLoader.loadLevel(1, () => { 
			levelLoader.loadLevel(2, () => { 
				onGameLoad(); 
			}); 
		});
	}
}

function onGameLoad()
{
	window.addEventListener("resize", onWindowResize);
	onWindowResize();

	uiManager = new UIManager();
	uiManager.setLevelLoadFunc(displayLevel);
	displayLevel(0);

	requestAnimationFrame(render);

}

function onWindowResize()
{
    const aspect = window.innerWidth / window.innerHeight;

    debugCam.aspect = aspect;
    debugCam.updateProjectionMatrix();

	menuCam.aspect = aspect;
    menuCam.updateProjectionMatrix();

	levelLoader.getLevels().map((e) => {
		if (e != null) {
			e.cameras.map((x) => { x.getCamera().aspect = aspect; });
			e.cameras.map((x) => { x.getCamera().updateProjectionMatrix(); });
		}
	});

    renderManager.setRenderSize(window.innerWidth, window.innerHeight);
}

function render() 
{
    const delta = clock.getDelta()
    controls.update(delta);

	if (lvl != null)
		updateLevel(delta);
    
    renderManager.render();
	
    requestAnimationFrame(render);
}

function displayLevel(levelNum)
{
	if (levelNum == 0)
	{
		menuCam.visible = true;

		if (lvl != null)
		{
			lvl.cameras.map((e) => { e.reset(); e.setActive(false); });
			lvl.scene.visible = false;
		}

		uiManager.displayStartScreen();

		lvl = null;
	}
	else
	{
		menuCam.visible = false;

		if (lvl != null)
		{
			lvl.cameras.map((e) => { e.reset(); e.setActive(false); });
			lvl.scene.visible = false;
		}

		lvl = levelLoader.getLevel(levelNum);

		score = 0;
		lives = 3;

		if (levelNum == 1)
			timeLeft = 600;
		else if (levelNum == 2)
			timeLeft = 900;

		timerRunning = true;

		currentCamera = 0;
		aiming = false;

		lvl.cameras.map((e) => { e.setMoving(true); });
		lvl.cameras[currentCamera].setVisible(true);

		if (!debug)
		{
			viewingCamera = lvl.cameras[currentCamera].getCamera();
			renderManager.setCamera(viewingCamera);
		}

		uiManager.setScoreGoal(lvl.quantumGroups.length);
		uiManager.setLives(lives);
		uiManager.setCameraCount(currentCamera + 1);
		uiManager.setTimer(timeLeft);

		uiManager.displayCameraScreen();

		lvl.helpers.map((e) => { e.visible = debug });

		lvl.scene.visible = true;
	}
}

function updateLevel(delta)
{
	if (timerRunning)
	{
		timeLeft -= delta;

		if (timeLeft <= 0)
		{
			lvl.cameras.map((e) => { e.setMoving(false); });

			setTimeout(() => {
				lvl.cameras[currentCamera].lightOff(() => { 
					setTimeout(() => { 
						displayLevel(0);
					}, 3000);
				});
			}, 2000);
			
			
			timerRunning = false;
			timeLeft = 0;
		}

		uiManager.setTimer(timeLeft);
	}

	laser.update();
	lvl.cameras.map(e => e.update());
	lvl.interactables.map(e => e.update(lvl.cameras[currentCamera]));
	lvl.quantumGroups.map(e => e.update());

	const observed = [];

	for (var i = 0; i < lvl.interactables.length; i++)
		if (lvl.interactables[i].isObserved() && lvl.interactables[i].getObject().visible)
			observed.push(lvl.interactables[i].getObject());

	raycaster.setFromCamera(pointer, viewingCamera);

	const intersects = raycaster.intersectObjects(observed);

	if (intersects[0] == null)
		selection = null;
	else
		selection = intersects[0];
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
    if (lvl != null && selection != null && !laser.isActive() && !lvl.cameras[currentCamera].isAnimating() && aiming)
    {
        var target = selection.object;
		
		while (lvl.interactableMap[target.name] == null)
		{
			target = target.parent;

			if (target == scene)
				return;
		}

		const obj = lvl.interactableMap[target.name];

        const objPos = getWorldPosition(obj.getObject());

        // Source of beam must be slightly offset from underneath
        //  the camera FOR SOME REASON otherwise it doesn't display
        const source = new Vector3(0, -0.1, -0.1);
        lvl.cameras[currentCamera].getLight().localToWorld(source);
        
        const dir = new Vector3();
        dir.subVectors(objPos, source).normalize();
        raycaster.set(source, dir);

        const hitPoint = selection.point;
        
		lvl.quantumGroups.map(e => e.setMoving(false));
        lvl.cameras[currentCamera].lightOff(() => { 
            laser.fire(source, hitPoint, () => {
				if (obj.getQuantumGroup() != -1)
				{
					lvl.quantumGroups[obj.getQuantumGroup()].setActive(false);
					uiManager.setScore(++score);
					if (score == lvl.quantumGroups.length)
					{
						lvl.cameras[currentCamera].lightOn(() => {
							setTimeout(() => { displayLevel(0); }, 3000);
							timerRunning = false;
						});
					}
					else
						lvl.cameras[currentCamera].lightOn(() => {
							aiming = false;
							lvl.cameras[currentCamera].setMoving(true); 
							lvl.quantumGroups.map(e => e.setMoving(true));
						});
				}
				else
				{
					obj.getObject().visible = false;
					uiManager.setLives(--lives);

					if (lives == 0)
					{
						lvl.cameras.map((e) => { e.setMoving(false); });
						setTimeout(() => { displayLevel(0); }, 3000);
						timerRunning = false;
					}
					else
						lvl.cameras[currentCamera].lightOn(() => {
							aiming = false;
							lvl.cameras[currentCamera].setMoving(true); 
							lvl.quantumGroups.map(e => e.setMoving(true));
						});
				}
            }); 
        });
    }
}

function onKeyDown(event)
{
    var keyCode = event.which;
    
	if (keyCode == 32 && lvl != null && !laser.isActive() && !lvl.cameras[currentCamera].isAnimating()) // Space
	{
		if (aiming)
		{
			aiming = false;
			lvl.cameras[currentCamera].setMoving(true);
		}
		else
		{
			aiming = true;
			lvl.cameras[currentCamera].setMoving(false);
		}
	}
	else if (keyCode == 16 && lvl != null && !laser.isActive() && !lvl.cameras[currentCamera].isAnimating()) // shift key
    {
		lvl.cameras[currentCamera].setMoving(true);
		lvl.cameras[currentCamera].setVisible(false);
        currentCamera = (currentCamera + 1) % lvl.cameras.length;
		lvl.cameras[currentCamera].setVisible(true);

		uiManager.setCameraCount(currentCamera + 1);

		if (!debug)
		{
			viewingCamera = lvl.cameras[currentCamera].getCamera();
			renderManager.setCamera(viewingCamera);
			renderManager.playStatic();
		}
    }
    else if (keyCode == 113) // F2 key
    {
        if (debug)
        {
			if (lvl == null)
				viewingCamera = menuCam;
			else
            	viewingCamera = lvl.cameras[currentCamera].getCamera();
            debug = false;
            helpers.map((e) => { e.visible = false; });
			lvl.helpers.map((e) => { e.visible = false });
            ambLight.intensity = 0;

			renderManager.setCamera(viewingCamera);
			renderManager.setScreenFX(true);
			uiManager.setUIVisible(true);
        }
        else
        {
            viewingCamera = debugCam;
            debug = true;
            helpers.map((e) => { e.visible = true; });
			lvl.helpers.map((e) => { e.visible = true });
            ambLight.intensity = 0.5;

			renderManager.setCamera(viewingCamera);
			renderManager.setScreenFX(false);
			
			uiManager.setUIVisible(false);

			debugCam.position.set(0, 5, 0);
			debugCam.rotation.set(0, 0, 0);
        }
    }
}

function getWorldPosition(obj)
{
    return obj.localToWorld(new Vector3(0, 0, 0));
}

export default App;