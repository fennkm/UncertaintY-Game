"use strict";

/**
 * Structure to hold data about a level
 * 
 * @param scene scene to put the level in
 * @param cameras list of camera wrappers in the level
 * @param interactables list of interactable object wrappers in the scene
 * @param interactableMap map that links each object in the scene to its wrapper
 * @param quantumGroup list of quantum group object in the scene
 * @param helpers list of helpers in the scene
 */
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