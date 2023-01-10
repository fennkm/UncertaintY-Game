"use strict";

import * as THREE from 'three';

export class QuantumGroup
{
    objs;

    activeObj;
    nextObj;
    switchReady;

    moving;
    active;

    constructor(objs)
    {
        this.objs = objs;

        this.active = true;
        
        this.moving = true;
        this.activeObj = 0;
        this.nextObj = 0;
        this.switchReady = false;

        this.objs.map(function(e) { e.getObject().visible = false; });
        this.objs[this.activeObj].getObject().visible = true;
    }

    update()
    {
        if(this.moving && this.objs[this.activeObj].isObserved())
        {
            this.switchReady = true;

            do
                this.nextObj = Math.floor(Math.random() * this.objs.length);
            while (this.nextObj == this.activeObj);
        }
 
        if (this.moving && this.switchReady && !this.objs[this.activeObj].isObserved() && !this.objs[this.nextObj].isObserved())
        {
            this.objs[this.activeObj].getObject().visible = false;
            this.objs[this.nextObj].getObject().visible = true;

            this.activeObj = this.nextObj;

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