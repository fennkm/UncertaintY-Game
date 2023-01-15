"use strict";

import * as THREE from 'three';
import * as PP from 'postprocessing';

/**
 * Handles rendering the scene to the screen and postprocessing effects
 * 
 * @param scene the scene to render to the screen
 * @param canvas the canvas to render to
 * @param camera the camera to render from
 */
export class RenderManager
{
    renderer;
    camera

    fxComposer;
    screenEffect;
    renderPass;

    noiseFX;
    lineFX;
    vignetteFX;

    staticFX;
    staticScreen;

    screenFXActive;

    constructor(scene, canvas, camera)
    {
		this.renderer = new THREE.WebGLRenderer({ canvas: canvas });

		this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.camera = camera;
		this.fxComposer = new PP.EffectComposer(this.renderer);

        this.renderPass = new PP.RenderPass(scene, this.camera)
		this.fxComposer.addPass(this.renderPass);

		this.noiseFX = new PP.NoiseEffect();
		this.noiseFX.blendMode = new PP.BlendMode(PP.BlendFunction.ALPHA, 0.2);

		this.lineFX = new PP.ScanlineEffect({ density: 0.4 });
		this.lineFX.blendMode = new PP.BlendMode(PP.BlendFunction.ALPHA, 0.01);
		
		this.vignetteFX = new PP.VignetteEffect({ darkness: 1 });
		this.vignetteFX.blendMode = new PP.BlendMode(PP.BlendFunction.ALPHA, 0.6);

		this.staticFX = new PP.NoiseEffect();
		this.staticFX.blendMode = new PP.BlendMode(PP.BlendFunction.ALPHA, 1);

		this.screenEffect = new PP.EffectPass(this.camera, 
			this.noiseFX,
			this.lineFX,
			this.vignetteFX
		);

        this.staticScreen = new PP.EffectPass(this.camera,
            this.staticFX
        );

		this.fxComposer.addPass(this.screenEffect);
        
        this.screenFXActive = true;
    }

    /**
     * Plays a static effect on the screen
     * 
     * @param audioManager the audioManager for the scene
     * @param callback called when effect finishes
     */
    playStatic(audioManager, callback)
    {
        if (this.screenFXActive)
        {
            this.fxComposer.removePass(this.screenEffect);
            this.fxComposer.addPass(this.staticScreen);
            this.fxComposer.addPass(this.screenEffect);

            audioManager.setStaticSound(true);

            setTimeout(() => { 
                audioManager.setStaticSound(false);
                this.fxComposer.removePass(this.staticScreen);
                callback();
            }, 1400);
        }
    }

    /**
     * Sets the camera to render from
     * 
     * @param camera camera object to render from
     */
    setCamera(camera)
    {
        this.camera = camera;
        
        this.fxComposer.setMainCamera(this.camera);
    }

    /**
     * Toggles the postprocessing effects
     * 
     * @param val turn effects on or off
     */
    setScreenFX(val)
    {
        if (val && !this.screenFXActive)
        {
            this.screenFXActive = true;
            this.fxComposer.addPass(this.screenEffect);
        }
        else if (!val && this.screenFXActive)
        {
            this.screenFXActive = false;
            this.fxComposer.removePass(this.screenEffect);
        }
    }

    /**
     * Sets the size of the rendering window
     * 
     * @param width width of the window
     * @param height height of the window
     */
    setRenderSize(width, height)
    {
        this.renderer.setSize(width, height);
    }

    /**
     * Renders the scene to the canvas
     */
    render()
    {
        this.fxComposer.render();
    }
}