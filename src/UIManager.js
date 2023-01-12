"use strict";

export class UIManager
{
    uiScreen;
    visible;

    menuUI;
    introButton;
    lvl1Button;
    lvl2Button;

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

    constructor()
    {
        this.menuUI = document.getElementById("menuUI");
        this.introButton = document.getElementById("option1");
        this.lvl1Button = document.getElementById("option2");
        this.lvl2Button = document.getElementById("option3");

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

        this.uiScreen = menuUI;
        this.uiScreen.style.display = "block";

        this.visible = true;

        this.introButton.onclick = () => { this.displayIntro(0); }; 
        this.nextButton1.onclick = () => { this.displayIntro(1); }; 
        this.nextButton2.onclick = () => { this.displayIntro(2); }; 
        this.nextButton3.onclick = () => { this.displayStartScreen(); }; 
    }

    setLevelLoadFunc(levelLoadFunc)
    {
        this.lvl1Button.onclick = () => { levelLoadFunc(1); }; 
        this.lvl2Button.onclick = () => { levelLoadFunc(2); }; 
    }
    
    displayStartScreen()
    {
        this.uiScreen.style.display = "none";
        this.uiScreen = menuUI;
        if (this.visible)
            this.uiScreen.style.display = "block";
    }
    
    displayIntro(page)
    {
        this.uiScreen.style.display = "none";

        const display = [this.introPage1, this.introPage2, this.introPage3][page];

        this.uiScreen = display;
        if (this.visible)
            this.uiScreen.style.display = "block";
    }
    
    displayCameraScreen()
    {
        this.uiScreen.style.display = "none";
        this.uiScreen = this.cameraUI;
        if (this.visible)
            this.uiScreen.style.display = "block";
    }

    setCameraCount(val)
    {
        this.cameraCounter.innerHTML = "CAM " + val;
    }

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

    setLives(val)
    {
        if (val > 3) val = 3;
        else if (val < 0) val = 0;

        for (var i = 0; i < val; i++)
            this.lifeCountSegments[i].style.visibility = "visible";

        for (; i < 3; i++)
            this.lifeCountSegments[i].style.visibility = "hidden";
    }

    setScoreGoal(val)
    {
        this.scoreGoal = val;
        this.score = 0;

        this.scoreText.innerHTML = this.score + " / " + this.scoreGoal;
    }

    setScore(val)
    {
        this.score = val;
        this.scoreText.innerHTML = this.score + " / " + this.scoreGoal;
    }

    setUIVisible(val)
    {
        this.visible = val;
        this.uiScreen.style.display = (val ? "block" : "none");
    }
}