"use strict";

export class Level
{
    
    constructor(scene, cameras, interactables, interactableMap, quantumGroups, helpers)
    {
        this.scene = scene;
        this.cameras = cameras;
        this.interactables = interactables;
        this.interactableMap = interactableMap;
        this.quantumGroups = quantumGroups;
        this.helpers = helpers;
    }
}