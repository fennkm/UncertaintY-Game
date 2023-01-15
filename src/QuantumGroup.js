"use strict";

/**
 * Group of objects that work as one teleporting object
 * 
 * @param objs list of objects to make into a quantum object
 */
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

    /**
     * Called every frame, changes the position of the object is conditions are right
     */
    update()
    {
        if(this.moving && !this.switchReady && this.objs[this.activeObj].isObserved())
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

    /**
     * Forces the object to stop teleporting or resume
     * 
     * @param val set the object moving or not 
     */
    setMoving(val)
    {
        if (this.active)
            this.moving = val;
    }

    /**
     * Removes or adds the object to the scene
     * 
     * @param val object active or not
     */
    setActive(val)
    {
        this.setMoving(val);

        this.active = val;

        this.objs.map(function(e) { e.getObject().visible = false; });

        this.objs[this.activeObj].getObject().visible = val;
    }

    /**
     * Gets whether the object is active or not
     * 
     * @returns true if the object is active
     */
    getActiveObj() { return this.objs[this.activeObj]; }
}