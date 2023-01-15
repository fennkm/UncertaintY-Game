"use strict";

export class UIManager
{
    uiScreen;
    visible;

    loadingUI;
    loadingBar;

    menuUI;
    introButton;
    lvl1Button;
    lvl2Button;
    soundOnBtn;
    soundOffBtn;

    introPage1;
    nextButton1;
    introPage2;
    nextButton2;
    introPage3;
    nextButton3;

    cameraUI;
    cameraCounter;
    timer;
    lifeCountSegments;
    scoreText;

    score;
    scoreGoal;

    /**
     * Controls the html UI overlay
     * 
     * @param audioManger the audio manager for the scene
     */
    constructor(audioManger)
    {
        this.audioManger = audioManger;

        this.loadingUI = document.getElementById("loadingUI");
        this.loadingBar = document.getElementById("loadingBar");

        this.menuUI = document.getElementById("menuUI");
        this.introButton = document.getElementById("option1");
        this.lvl1Button = document.getElementById("option2");
        this.lvl2Button = document.getElementById("option3");
        this.soundOnBtn = document.getElementById("soundOn");
        this.soundOffBtn = document.getElementById("soundOff");

        this.introPage1 = document.getElementById("introUI1");
        this.nextButton1 = document.getElementById("page1Next");
        this.introPage2 = document.getElementById("introUI2");
        this.nextButton2 = document.getElementById("page2Next");
        this.introPage3 = document.getElementById("introUI3");
        this.nextButton3 = document.getElementById("page3Next");

        this.cameraUI = document.getElementById("cameraUI");
        this.cameraCounter = document.getElementById("camCount");
        this.timer = document.getElementById("timer");
        this.lifeCountSegments = [
            document.getElementById("lifeBar1"),
            document.getElementById("lifeBar2"),
            document.getElementById("lifeBar3")]
        this.scoreText = document.getElementById("scoreText");

        this.score = 0;
        this.scoreGoal = 0;

        this.visible = true;

        const buttons = document.getElementsByClassName("button");
        
        for (var i = 0; i < buttons.length; i++)
            buttons[i].onmouseover = () => {
                this.audioManger.playHoverSound(() => {});
            };

        this.introButton.onclick = () => { 
            this.audioManger.playClickSound(() => {});
            this.displayIntro(0); 
        };

        this.nextButton1.onclick = () => { 
            this.audioManger.playClickSound(() => {});
            this.displayIntro(1);
        }; 

        this.nextButton2.onclick = () => { 
            this.audioManger.playClickSound(() => {});
            this.displayIntro(2);
        }; 
        
        this.nextButton3.onclick = () => {
            this.audioManger.playClickSound(() => {});
            this.displayStartScreen();
        }; 

        this.soundOnBtn.onclick = () => { 
            this.soundOnBtn.style.display = "none";
            this.audioManger.setSound(false);
            this.soundOffBtn.style.display = "block";
        };

        this.soundOffBtn.onclick = () => {
            this.soundOffBtn.style.display = "none";
            this.audioManger.setSound(true);
            this.soundOnBtn.style.display = "block";
        };
    }

    /**
     * Sets the function to run when a level button is selected
     * 
     * @param levelLoadFunc function to load levels
     */
    setLevelLoadFunc(levelLoadFunc)
    {
        this.lvl1Button.onclick = () => { 
            this.audioManger.playClickSound(() => { 
                levelLoadFunc(1); 
            })
        }; 

        this.lvl2Button.onclick = () => { 
            this.audioManger.playClickSound(() => { 
                levelLoadFunc(2); 
            })
        }; 
    }
    
    /**
     * Displays the loading overlay and removes any existing one
     */
    displayLoadingScreen()
    {
        if (this.uiScreen != null)
            this.uiScreen.style.display = "none";
            
        this.uiScreen = this.loadingUI;
        if (this.visible)
            this.uiScreen.style.display = "block";
    }
    
    /**
     * Sets the progress of the loading bar on the loading screen
     * 
     * @param progress loading progress from 0 to 1
     */
    setLoadingProgress(progress)
    {
        console.log((progress * 1200) + "px");
        this.loadingBar.style.width = (progress * 1200) + "px";
    }
    
    /**
     * Displays the main menu overlay and removes any existing one
     */
    displayStartScreen()
    {
        if (this.uiScreen != null)
            this.uiScreen.style.display = "none";
            
        this.uiScreen = this.menuUI;
        if (this.visible)
            this.uiScreen.style.display = "block";
    }
    
    /**
     * Displays the overlay for a page of the intro menu and removes any existing one
     * 
     * @param page intro page to display
     */
    displayIntro(page)
    {
        if (this.uiScreen != null)
            this.uiScreen.style.display = "none";
            

        const display = [this.introPage1, this.introPage2, this.introPage3][page];

        this.uiScreen = display;
        if (this.visible)
            this.uiScreen.style.display = "block";
    }
    
    /**
     * Displays the camera HUD overlay and removes any existing one
     */
    displayCameraScreen()
    {
        if (this.uiScreen != null)
            this.uiScreen.style.display = "none";
            
        this.uiScreen = this.cameraUI;
        if (this.visible)
            this.uiScreen.style.display = "block";
    }
    
    /**
     * Sets the cam number of the camera HUD
     * 
     * @param val camera number to display
     */
    setCameraCount(val)
    {
        this.cameraCounter.innerHTML = "CAM " + val;
    }

    /**
     * Sets the timer of the camera HUD
     * 
     * @param seconds number of seconds to display on the timer
     */
    setTimer(seconds)
    {
        var mins = Math.trunc(seconds / 60);
        if (mins < 10)
            mins = "0" + mins;

        var secs = Math.trunc(seconds % 60);
        if (secs < 10)
            secs = "0" + secs;

        this.timer.innerHTML = mins + ":" + secs;
    }

    /**
     * Set the life counter of the camera HUD
     * 
     * @param val number of lives to display
     */
    setLives(val)
    {
        if (val > 3) val = 3;
        else if (val < 0) val = 0;

        for (var i = 0; i < val; i++)
            this.lifeCountSegments[i].style.visibility = "visible";

        for (; i < 3; i++)
            this.lifeCountSegments[i].style.visibility = "hidden";
    }

    /**
     * Set the total number of enemies to display on the camera HUD
     * 
     * @param val enemy total to display
     */
    setScoreGoal(val)
    {
        this.scoreGoal = val;
        this.score = 0;

        this.scoreText.innerHTML = this.score + " / " + this.scoreGoal;
    }

    /**
     * Set the current score to display in the camera HUD
     * 
     * @param val score to display
     */
    setScore(val)
    {
        this.score = val;
        this.scoreText.innerHTML = this.score + " / " + this.scoreGoal;
    }

    /**
     * Show or hide the UI overlay
     * 
     * @param val show or hide overlay
     */
    setUIVisible(val)
    {
        this.visible = val;
        this.uiScreen.style.display = (val ? "block" : "none");
    }
}