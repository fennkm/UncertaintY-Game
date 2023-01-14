"use strict";

import * as THREE from 'three';
import * as PP from 'postprocessing';

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

    playStatic()
    {
        this.fxComposer.removePass(this.screenEffect);
        this.fxComposer.addPass(this.staticScreen);
		this.fxComposer.addPass(this.screenEffect);

        setTimeout(() => { 
            this.fxComposer.removePass(this.staticScreen);
        }, 1000);
    }

    setCamera(camera)
    {
        this.camera = camera;
        
        this.fxComposer.setMainCamera(this.camera);
    }

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

    setRenderSize(width, height)
    {
        this.renderer.setSize(width, height);
    }

    render()
    {
        this.fxComposer.render();
    }
}