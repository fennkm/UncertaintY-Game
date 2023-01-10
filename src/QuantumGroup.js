"use strict";

import * as THREE from 'three';

export class QuantumGroup
{
    objs;

    activeObj;
    switchReady;

    moving;
    active;

    constructor(objs)
    {
        this.objs = objs;

        this.active = true;
        
        this.moving = true;
        this.activeObj = 0;
        this.switchReady = false;

        this.objs.map(function(e) { e.getObject().visible = false; });
        this.objs[this.activeObj].getObject().visible = true;
    }

    update()
    {
        if(this.moving && !this.switchReady && this.objs[this.activeObj].isObserved())
            this.switchReady = true;
 
        if (this.moving && this.switchReady && !this.objs[this.activeObj].isObserved())
        {
            var prevPos = this.activeObj;
            while (this.objs[this.activeObj].isObserved())
                this.activeObj = Math.floor(Math.random() * this.objs.length);
            
            this.objs[prevPos].getObject().visible = false;
            this.objs[this.activeObj].getObject().visible = true;
            this.switchReady = false;
        }
    }

    setMoving(val)
    {
        this.moving = val;
    }

    setActive(val)
    {
        this.setMoving(val);

        this.objs[this.activeObj].visible = val;
    }

    getActiveObj() { return this.objs[this.activeObj]; }
}