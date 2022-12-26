"use strict";

import * as THREE from 'three';
import { Vector3, Vector2 } from 'three';
import * as PP from 'postprocessing';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { QuantumObject } from './QuantumObject.js';
import { Laser } from './Laser.js';
import { Camera } from './Camera.js';

let scene;
let renderer, fxComposer, screenEffect;
let activeCamera, camera, debugCam;
let ambLight;
let controls, clock;
let pointer, raycaster, laser, selectedObj;
let qCube;

var debug = false;
var helpers;

class App 
{
	init() 
	{
		const canvas = document.getElementById("gl-canvas");
		renderer = new THREE.WebGLRenderer({ 
			canvas: canvas,
			powerPreference: "high-performance",
			antialias: false,
			stencil: false,
			depth: false
		});
		renderer.shadowMap.enabled = true;
		
		scene = new THREE.Scene();
		scene.background = new THREE.Color('black');

		clock = new THREE.Clock();

		raycaster = new THREE.Raycaster();

		camera = new Camera(scene, new Vector3(0, 20, 60), Math.PI / 12, 0, Math.PI / 2, Math.PI / 18);
	
		const fov = 45;
		const aspect = 2;
		const near = 0.1;
		const far = 10000;
		debugCam = new THREE.PerspectiveCamera(fov, aspect, near, far);
		debugCam.position.set(0, 5, 0);

		activeCamera = (debug ? debugCam : camera.getCamera());

		fxComposer = new PP.EffectComposer(renderer);

		fxComposer.addPass(new PP.RenderPass(scene, activeCamera));

		const noiseFX = new PP.NoiseEffect();
		noiseFX.blendMode = new PP.BlendMode(PP.BlendFunction.ALPHA, 0.04);

		const lineFX = new PP.ScanlineEffect({ density: 0.4 });
		lineFX.blendMode = new PP.BlendMode(PP.BlendFunction.ALPHA, 0.004);
		
		const vignetteFX = new PP.VignetteEffect({ darkness: 1 });
		vignetteFX.blendMode = new PP.BlendMode(PP.BlendFunction.ALPHA, 1);

		screenEffect = new PP.EffectPass(activeCamera, 
			noiseFX,
			lineFX,
			vignetteFX
		);

		fxComposer.addPass(screenEffect);
		
		createControls(debugCam);

		var ambLightIntensity;
		if (debug)
			ambLightIntensity = 0.5
		else
			ambLightIntensity = 0.022
		ambLight = new THREE.AmbientLight( 0x404040, ambLightIntensity);
		scene.add(ambLight);

		const tLoader = new THREE.TextureLoader();

		const textureGrass = tLoader.load('../assets/textures/Grass002_2K_Color.png');
		textureGrass.wrapS = THREE.RepeatWrapping;
		textureGrass.wrapT = THREE.RepeatWrapping;
		textureGrass.repeat.set(10, 10);

		const grassNormal = tLoader.load('../assets/textures/Grass002_2K_NormalGL.png');
		grassNormal.wrapS = THREE.RepeatWrapping;
		grassNormal.wrapT = THREE.RepeatWrapping;
		grassNormal.repeat.set(10, 10);

		const planeGeo = new THREE.PlaneGeometry(1000, 1000);
		const planeMat = new THREE.MeshStandardMaterial({ map: textureGrass, normalMap: grassNormal, normalScale: new Vector2(0.2, 0.2) });
		const plane = new THREE.Mesh(planeGeo, planeMat);
		plane.rotateX(-Math.PI / 2);
		plane.receiveShadow = true;
		scene.add(plane);

		const textureBrick =  tLoader.load('../assets/textures/Bricks_Terracotta.jpg')
		const AOTexture = tLoader.load('../assets/textures/Bricks_Terracotta_002_ambientOcclusion.jpg');
		const bumpTexture = tLoader.load('../assets/textures/Bricks_Terracotta_002_height.png');
		const normalTexture = tLoader.load('../assets/textures/Bricks_Terracotta_002_normal.jpg');
		const roughTexture = tLoader.load('../assets/textures/Bricks_Terracotta_002_roughness.jpg');
	
		const dist = 20;
		const size = 5;
		const num = 5;

		var cubes = [];

		for (var i = 0; i < num; i++)
		{
			const cube = createCube(
				size, 
				dist * Math.sin(i * 2 * Math.PI / num),
				2.5,
				-dist * Math.cos(i * 2 * Math.PI / num),
				0,
				-i * Math.PI * Math.PI / num + 1,
				0
			);

			cubes.push(cube);
		}

		qCube = new QuantumObject(cubes, camera, Math.PI / 12);

		function createCube(size, x, y, z, rx, ry, rz)
		{
			const cubeMaterial = new THREE.MeshStandardMaterial({map: textureBrick, aoMap: AOTexture, roughnessMap: roughTexture, normalMap: normalTexture, bumpMap: bumpTexture});    
			const cubeGeo = new THREE.BoxGeometry(size, size, size);
			const cube = new THREE.Mesh(cubeGeo, cubeMaterial);
			cube.geometry.setAttribute('uv2', cube.geometry.getAttribute("uv"));
			cube.position.set(x, y, z);
			cube.rotation.set(rx, ry, rz);
			cube.castShadow = true;
			cube.receiveShadow = true;
			scene.add(cube);
			cubeGeo.computeBoundingBox()
			return cube;
		}

		laser = new Laser(scene);

		window.addEventListener("resize", onWindowResize);
		onWindowResize();
		
		pointer = new Vector2();
		window.addEventListener("pointermove", onPointerMove);
		window.addEventListener("pointerdown", onPointerDown);

		window.addEventListener("keydown", onKeyDown);

		helpers = [new THREE.SpotLightHelper(camera.light), new THREE.SpotLightHelper(camera.innerLight), new THREE.CameraHelper(camera.camera), new THREE.PointLightHelper(laser.laserLight)]
		scene.add(helpers[0]);
		scene.add(helpers[1]);
		scene.add(helpers[2]);
		scene.add(helpers[3]);

		for (var i = 0; i < num; i++)
		{
			const arrowHelper = new THREE.ArrowHelper(new Vector3(0, 1, 0), cubes[i].position, 1);
			scene.add(arrowHelper);
			helpers.push(arrowHelper);
		}

		if (!debug)
			helpers.map(function(e) { e.visible = false; });

		requestAnimationFrame(render);

	}

}

function onWindowResize()
{
    const aspect = window.innerWidth / window.innerHeight;

    camera.getCamera().aspect = aspect;
    debugCam.aspect = aspect;
    camera.getCamera().updateProjectionMatrix();
    debugCam.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() 
{
    const delta = clock.getDelta()
    controls.update(delta);

    qCube.update();
    laser.update();
    camera.update();

    raycaster.setFromCamera(pointer, activeCamera);

    if (selectedObj != null)
        selectedObj.material.color.set(0xffffff);
    
    const intersects = raycaster.intersectObjects(qCube.objs);

    if (intersects[0] == null)
        selectedObj = null;
    else
        selectedObj = intersects[0].object;

    const s = performance.now();

    // renderer.render(scene, activeCamera);
    
    fxComposer.render();

    const t = performance.now();
    if (t - s > 10)
        console.log("Slow render frame!");

    requestAnimationFrame(render);
}


function createControls(camera) 
{
    controls = new FlyControls(camera, renderer.domElement);

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
    if (selectedObj != null && !laser.isActive() && !camera.isAnimating())
    {
        const obj = selectedObj;
        const objPos = getWorldPosition(obj);

        // Source of beam must be slightly offset from underneath
        //  the camera FOR SOME REASON otherwise it doesn't display
        const source = new Vector3(0, 0, -0.1);
        camera.getLight().localToWorld(source);
        
        const dir = new Vector3();
        dir.subVectors(objPos, source).normalize();
        raycaster.set(source, dir);

        const hitPoint = raycaster.intersectObject(obj)[0].point;

        camera.setMoving(false);
        
        camera.lightOff(() => { 
            laser.fire(source, hitPoint, () => { 
                camera.lightOn(() => { 
                    camera.setMoving(true); 
                }); 
            }); 
        });
    }
}

function onKeyDown(event)
{
    var keyCode = event.which;
    
    if (keyCode == 113) // F2 key
    {
        if (debug)
        {
            activeCamera = camera.camera;
            debug = false;
            helpers.map(function(e) { e.visible = false; });
            ambLight.intensity = 0.022;

			fxComposer.setMainCamera(activeCamera);
			fxComposer.addPass(screenEffect);
        }
        else
        {
            activeCamera = debugCam;
            debug = true;
            helpers.map(function(e) { e.visible = true; });
            ambLight.intensity = 0.5;

			fxComposer.setMainCamera(activeCamera);
			fxComposer.removePass(screenEffect);
        }
    }
}

function getWorldPosition(obj)
{
    return obj.localToWorld(new Vector3(0, 0, 0));
}

export default App;