"use strict";

import * as THREE from 'three';
import * as PP from 'postprocessing';

export class RenderManager
{
    renderer;

    fxComposer;
    screenEffect;
    renderPass;

    screenFXActive;

    constructor(scene, canvas, camera)
    {
		this.renderer = new THREE.WebGLRenderer({ canvas: canvas });

		this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.camera = camera;
		this.fxComposer = new PP.EffectComposer(this.renderer);

        this.renderPass = new PP.RenderPass(scene, camera)
		this.fxComposer.addPass(this.renderPass);

		const noiseFX = new PP.NoiseEffect();
		noiseFX.blendMode = new PP.BlendMode(PP.BlendFunction.ALPHA, 0.06);

		const lineFX = new PP.ScanlineEffect({ density: 0.4 });
		lineFX.blendMode = new PP.BlendMode(PP.BlendFunction.ALPHA, 0.004);
		
		const vignetteFX = new PP.VignetteEffect({ darkness: 1 });
		vignetteFX.blendMode = new PP.BlendMode(PP.BlendFunction.ALPHA, 0.6);

		this.screenEffect = new PP.EffectPass(camera, 
			noiseFX,
			lineFX,
			vignetteFX
		);

		this.fxComposer.addPass(this.screenEffect);

        this.screenFXActive = true;
    }

    setCamera(camera)
    {
        this.camera = camera;
        
        this.fxComposer.setMainCamera(camera);
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