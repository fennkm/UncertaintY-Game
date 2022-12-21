"use strict";

import * as THREE from 'three';
import { Vector3, Vector2 } from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import { MeshLine, MeshLineMaterial } from 'ext/WebGL/MeshLine/MeshLine.js';
import { QuantumObject } from './QuantumObject.js';

let scene;
let renderer, canvas, fxComposer;
let activeCamera, camera, debugCam, cameraHolder;
let light, innerLight, ambLight;
let controls, clock;
let pointer, raycaster, laser, laserLight, selectedObj;
let qCube;

var cameraRot;

var laserOn = false;
var laserTimer = 0;
const laserDuration = 1;

var debug = false;
var helpers;

function main() 
{
    canvas = document.getElementById("gl-canvas");
    renderer = new THREE.WebGLRenderer({ canvas });
    renderer.shadowMap.enabled = true;

    clock = new THREE.Clock();
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color('black');

    fxComposer = new EffectComposer(renderer);
  
    const fov = 45;
    const aspect = 2;
    const near = 0.1;
    const far = 10000;
    camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.rotation.set(0, 0, 0);
    cameraRot = 0;
  
    debugCam = new THREE.PerspectiveCamera(fov, aspect, near, far);
    debugCam.position.set(0, 5, 0);

    activeCamera = (debug ? debugCam : camera);

    cameraHolder = new THREE.Object3D();
    cameraHolder.position.set(0, 5, 0);

    scene.add(cameraHolder);
    cameraHolder.add(camera);
    
    createControls(debugCam);

    var ambLightIntensity;
    if (debug)
        ambLightIntensity = 2 //0.5
    else
        ambLightIntensity = 0.6 //0.022
    ambLight = new THREE.AmbientLight( 0x404040, ambLightIntensity);
    scene.add( ambLight );

    light = new THREE.SpotLight( 0xddddff, 1, undefined, Math.PI / 12, 0.2);
	light.position.set(0, -1, 0);

    light.castShadow = true;

    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    light.shadow.camera.near = 1;
    light.shadow.camera.far = 1000;

    light.shadow.camera.fov = 120;
    light.shadow.radius = 10;
	camera.add(light);

    innerLight = new THREE.SpotLight( 0xffffff, 2, undefined, Math.PI / 16, 0.6);
	innerLight.position.set(0, 0, 0);
	light.add(innerLight);

    const lightTarget = new THREE.Object3D();
    lightTarget.position.set(0, 0, -1);
    light.add(lightTarget);
    light.target = lightTarget;
    innerLight.target = lightTarget;

    const tLoader = new THREE.TextureLoader();

    const textureGrass = tLoader.load('./Assets/Textures/Grass002_2K_Color.png');
    textureGrass.wrapS = THREE.RepeatWrapping;
    textureGrass.wrapT = THREE.RepeatWrapping;
    textureGrass.repeat.set(10, 10);

    const grassNormal = tLoader.load('./Assets/Textures/Grass002_2K_NormalGL.png');
    grassNormal.wrapS = THREE.RepeatWrapping;
    grassNormal.wrapT = THREE.RepeatWrapping;
    grassNormal.repeat.set(10, 10);


    const planeGeo = new THREE.PlaneGeometry(1000, 1000);
    const planeMat = new THREE.MeshStandardMaterial({ map: textureGrass, normalMap: grassNormal, normalScale: new Vector2(0.2, 0.2) });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotateX(-Math.PI / 2);
    plane.receiveShadow = true;
    //scene.add(plane);

    const textureBrick =  tLoader.load('./Assets/Textures/Bricks_Terracotta.jpg')
    const AOTexture = tLoader.load('./Assets/Textures/Bricks_Terracotta_002_ambientOcclusion.jpg');
    const bumpTexture = tLoader.load('./Assets/Textures/Bricks_Terracotta_002_height.png');
    const normalTexture = tLoader.load('./Assets/Textures/Bricks_Terracotta_002_normal.jpg');
    const roughTexture = tLoader.load('./Assets/Textures/Bricks_Terracotta_002_roughness.jpg');
 
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

    qCube = new QuantumObject(cubes, camera, light, Math.PI / 12);

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

    raycaster = new THREE.Raycaster();

    const laserMaterial = new MeshLineMaterial({ color: 0xff0000, lineWidth: 0.1, side: THREE.DoubleSide });
    const laserLine = new MeshLine();
    laser = new THREE.Mesh(laserLine, laserMaterial);
    laser.visible = false;
    scene.add(laser);

    laserLight = new THREE.PointLight();
    laserLight.distance = 10;
    laserLight.intensity = 5;
    laserLight.color = new THREE.Color(1, 0, 0);
    laserLight.castShadow = true;
    laserLight.visible = false;
    scene.add(laserLight);

    window.addEventListener("resize", onWindowResize);
    onWindowResize();
    
    pointer = new Vector2();
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);

    window.addEventListener("keydown", onKeyDown);

    helpers = [new THREE.SpotLightHelper(light), new THREE.SpotLightHelper(innerLight), new THREE.CameraHelper(camera), new THREE.PointLightHelper(laserLight)]
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


function onWindowResize()
{
    const aspect = window.innerWidth / window.innerHeight;

    camera.aspect = aspect;
    debugCam.aspect = aspect;
    camera.updateProjectionMatrix();
    debugCam.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() 
{
        const delta = clock.getDelta()
        controls.update(delta);

        if (laserOn)
        {
            laserTimer += delta;

            if (laserTimer >= laserDuration)
            {
                laserTimer = 0;
                laserOn = false;
                laser.visible = false;
                laserLight.visible = false;

                light.visible = true;
                innerLight.visible = true;
            }
        }
        else
        {
            cameraRot -= Math.PI / 8 * delta;
            cameraHolder.rotation.set(0, cameraRot, 0);
        }

        if (debug)
            helpers.map(function(e) { if (e.geometry != null) e.geometry.computeBoundingBox(); });

        qCube.update();

        raycaster.setFromCamera(pointer, activeCamera);

        if (selectedObj != null)
            selectedObj.material.color.set(0xffffff);

        const intersects = raycaster.intersectObjects(qCube.objs);

        if (intersects[0] == null)
            selectedObj = null;
        else
            selectedObj = intersects[0].object;

        renderer.render(scene, activeCamera);
        
        // fxComposer.addPass(new RenderPass(scene, activeCamera));
        // fxComposer.render();

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
    if (selectedObj != null && !laserOn)
    {
        const obj = selectedObj;
        const objPos = getWorldPosition(obj);

        // Source of beam must be slightly offset from underneath
        //  the camera FOR SOME REASON otherwise it doesn't display
        const source = new Vector3(0, 0, -0.1);
        light.localToWorld(source);
        
        const dir = new Vector3();
        dir.subVectors(objPos, source).normalize();
        raycaster.set(source, dir);

        const hitPoint = raycaster.intersectObject(obj)[0].point;

        laser.geometry.setPoints([hitPoint, source]);
        laser.geometry.computeBoundingSphere();
        laser.visible = true;

        const lightPoint = new Vector3();

        lightPoint.subVectors(hitPoint, dir.clone().multiplyScalar(0.5));

        laserLight.position.set(lightPoint.x, lightPoint.y, lightPoint.z);
        laserLight.visible = true;

        light.visible = false;
        innerLight.visible = false;

        laserOn = true;
    }
}

function onKeyDown(event)
{
    var keyCode = event.which;
    
    if (keyCode == 113) // F2 key
    {
        if (debug)
        {
            activeCamera = camera;
            debug = false;
            helpers.map(function(e) { e.visible = false; });
            ambLight.intensity = 0.6;
        }
        else
        {
            activeCamera = debugCam;
            debug = true;
            helpers.map(function(e) { e.visible = true; });
            ambLight.intensity = 2;
        }
    }
};

function getWorldPosition(obj)
{
    return obj.localToWorld(new Vector3(0, 0, 0));
}

main();
