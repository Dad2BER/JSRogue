/* Normall this may all go inside the main.js file, but I want to keep main.js as clean as possible to show the minimum a main.js needs to contain */
import { Game } from "./game.js";
import { Player } from "./myPlayer.js";
import { Dungeon } from "./dungeonClasses/dungeon.js";
import { playerDamageText, monsterDamageText, statusText, youDiedText, levelChangeText, gameStats } from "./text.js";
import { Point, RandomNumber, direction } from "./dungeonClasses/utilities.js";
import { PlayerCanvas } from "./playerCanvas.js";
import { StoryText } from "./storyText.js";
import { Potion, PotionDictionary, potionColorText, potionEffect, potionEffectText} from "./dungeonClasses/potion.js";
import { Scroll, ScrollDictionary, scrollColorText, scrollEffect, scrollEffectText } from "./dungeonClasses/scroll.js";
import { BackGround } from "./sprite_classes/background.js";
import { CookieHandler, HighScore } from "./cookie.js";
import { binary, fireBall, helpScreen } from "./sprite_classes/knownSprites.js";


export class MyGame extends Game {
    constructor(mapCanvasID, playerCanvasID, storyTextAreaID, width, height) {
        super(mapCanvasID, width, height);
        this.cookie = new CookieHandler();
        this.overlayTexts = [];
        this.diceBag = new RandomNumber();
        this.potionDictionary = new PotionDictionary();
        this.scrollDictionary = new ScrollDictionary();
        this.backGround = new BackGround('light_cloud', 'dark_cloud', width, height);
        this.player = new Player(0,0); //Does not matter where, because popualteLevel will move them.
        this.playerCanvas = new PlayerCanvas(this.player, playerCanvasID, this.potionDictionary, this.scrollDictionary);
        this.storyText = new StoryText(storyTextAreaID);
        this.storyText.addLine("");
        this.storyText.addLine("Skeleton used for player comes from FREE FANTASY ENEMIES PIXEL ART SPRITE PACK at graphpix.net");
        this.storyText.addLine("Dungeon graphics come from dungeon crawl tiles at OpenGameArt.org")
        this.storyText.addLine("");
        this.dungeon = new Dungeon(Math.floor(width/32), Math.floor(height/32),15,this.potionDictionary, this.scrollDictionary);
        this.dungeon.addPlayer(this.player);
        this.player.show();
        this.readyForInput = true;
        let cookieRunCount = this.cookie.getCookie("runCount");
        this.runCount = 0;
        if (cookieRunCount > 0) { this.runCount = cookieRunCount; }
        this.runCount++;
        this.cookie.setCookie("runCount", this.runCount, 90);
       //this.cookie.clearTop10();
        //this.cookie.setTop10( new HighScore(this.runCount, "Hello", this.diceBag.intBetween(1,100), null) );
        this.cookie.logCookies();
        this.helpScreen = new helpScreen(width/2, height/2);
        this.helpScreen.show();
        this.youDiedText = null;
        this.rangeAttacks = [];
        //this.fpsText = new gameStats("FPS: ", new Point(40,20));
        this.playerName = prompt("Please enter your name", "Player"+this.runCount);
        if (this.playerName == null) {
            this.playerName = "Player"+this.runCount;
        } 
    }
    
    handleInput() {
        if (this.player.hitPoints > 0) {
            let keys = this.InputHandler.keys;
            this.player.handleInput(keys); // Arrow keys
            this.playerCanvas.handleInput(keys); // 'p' and 's'
            if ( this.InputHandler.useKey('q') || this.InputHandler.useKey('Q') ) { this.quaffPotion(); }
            if ( this.InputHandler.useKey('r') || this.InputHandler.useKey('R') ) { this.readScroll(); }
            if ( this.InputHandler.useKey('d') || this.InputHandler.useKey('D') ) { this.useStairs(true); }
            if ( this.InputHandler.useKey('u') || this.InputHandler.useKey('U') ) { this.useStairs(false); }
        }
        if ( this.InputHandler.useKey('?') || this.InputHandler.useKey('Escape') ) {  this.helpScreen.isVisible() ? this.helpScreen.hide() : this.helpScreen.show();  }
        /*
        if ( this.InputHandler.useKey('m') ) { this.dungeon.currentLevel.showMap();} //Debug command to show the level
        if ( this.InputHandler.useKey('!') ) { 
            this.potionDictionary.potions.forEach((potion) => {
                this.player.addItem(new Potion(0,0,potion.color, potion.effect));
            })
            this.scrollDictionary.scrolls.forEach((scroll) => {
                this.player.addItem(new Scroll(0,0,scroll.color, scroll.effect));
            })
        }
        */
    }

    useStairs(goDown) {
        let stairs = this.dungeon.currentLevel.stairCollisions(this.player.getHitBox());
        let used = false;
        stairs.forEach((stair) => { 
            if (goDown && stair.frameX == binary.DOWN) {
                used = true;
                this.dungeon.goDown(this.player);
                this.storyText.addLine("You decend to level " + (this.dungeon.levelIndex+1).toString());
            }
            else if (goDown == false && stair.frameX == binary.UP) {
                used = true;
                this.dungeon.goUp(this.player);                
                this.storyText.addLine("You climb back to level " + (this.dungeon.levelIndex+1).toString());
            }
        })
        if (used) {
            this.overlayTexts.push( new levelChangeText( "Level " + (this.dungeon.levelIndex+1).toString(), this.player.getLocation() ) );
        }
        return used;
    }

    quaffPotion() {
        let effect = this.playerCanvas.quaffPotion();
        if (effect != null) {
            this.storyText.addLine("You drank a " + potionEffectText[effect] + " potion.");
            if (effect == potionEffect.RANDOM) {
                this.storyText.addLine("Wild uncontrollable things happen...");
                if (this.diceBag.percent() < 20) { //Potentail to reset all stats
                    this.storyText.addLine("For better or worse, you feel normal again.");
                    this.player.resetStats();
                }
                else { //Pick something else
                    while (effect == potionEffect.RANDOM) { 
                        effect = this.diceBag.intBetween(1, potionEffectText.length); 
                    } 
                }
            }
            switch(effect) {
                case potionEffect.DEXTARITY:
                    this.storyText.addLine("Your dodge skills imporve, you will take less damage.");
                    this.player.defenceModifier += 1;
                    break;
                case potionEffect.HEAL:
                    let heal = this.diceBag.intBetween(1, 6);
                    if (this.player.maxHitPoints - this.player.hitPoints < heal) {
                        heal = this.player.maxHitPoints - this.player.hitPoints;
                    }
                    this.storyText.addLine("You are healed for " + heal + " points.");
                    this.player.hitPoints += heal;
                    break;
                case potionEffect.POISON:
                    let damage = this.diceBag.intBetween(1, 4);
                    this.storyText.addLine("You took " + damage + " damage.");
                    this.player.hitPoints -= damage;
                    this.isPlayerDead("You drank yourself to death.");
                    break;
                case potionEffect.STRENGTH:
                    this.storyText.addLine("You are stronger, you will do more damage.");
                    this.player.damageModifier += 1;
                    break;
            }    
        }
        else {
            this.storyText.addLine("You don't have any potions to drink.")
        }
    }

    readScroll() {
        let effect = this.playerCanvas.readScroll();
        if (effect != null) {
            this.storyText.addLine("You read a " + scrollEffectText[effect] + " scroll");
            if (effect == scrollEffect.RANDOM) {
                this.storyText.addLine("Wild uncontrollable things happen...");
                while (effect == scrollEffect.RANDOM) { effect = this.diceBag.intBetween(1, scrollEffectText.length); } //Now we pick something else
            }
            switch (effect) {
                case scrollEffect.IDENTIFY:
                    this.storyText.addLine("You understand a little more magic...");
                    let item = this.playerCanvas.identifyItem();
                    if (item != null) {
                        switch(item.spriteType) {
                            case 'potions':
                                this.storyText.addLine("You know that " + potionColorText[item.color] + 
                                                        " are " + potionEffectText[item.effect] + " potions");
                                break;
                            case 'scrolls':
                                this.storyText.addLine("You know that " + scrollColorText[item.color] + 
                                                        "are " + scrollEffectText[item.effect] + " scrolls");
                                break;
                            default:
                                this.storyText.addLine("I don't know what you identified: " + item.spriteType);
                                break;
                        }
                    }
                    break;
                case scrollEffect.FIREBALL:
                    this.storyText.addLine("Fire courses though your hands...");
                    let fb = new fireBall(this.player.x, this.player.y, this.player.facing, 50);
                    fb.show();
                    this.rangeAttacks.push( fb );
                    break;
                case scrollEffect.MAP:
                    this.storyText.addLine("It looks to be a map to this level of the dungeon.");
                    let random = this.diceBag.d10();
                    if (random < 6) {
                        this.storyText.addLine("You can now see all the rooms, doors, and stairs.");
                        this.dungeon.currentLevel.showLevelDetail(true, false, false, false, false, false);
                    }
                    else if (random < 8) {
                        this.storyText.addLine("The map includes where treasure chests are.");
                        this.dungeon.currentLevel.showLevelDetail(true, false, true, false, false, false);
                    }
                    else if (random < 9) {
                        this.storyText.addLine("The map is recent and includes all treasure.");
                        this.dungeon.currentLevel.showLevelDetail(true, false, true, true, true, true);
                    }
                    else {
                        this.storyText.addLine("The map is magic and shows everything.");
                        this.dungeon.currentLevel.showLevelDetail(true, true, true, true, true, true);
                    }
                    break;
                case scrollEffect.CURSE:
                    this.storyText.addLine("Life sucks...you feel weaker.")
                    this.player.defenceModifier -= 1;
                    break;
            }
        }
        else {
            this.storyText.addLine("You don't have any scrolls to read.")
        }
    }

    updateCombat() {
        let monsters = this.dungeon.currentLevel.monsterCollisions(this.player.getHitBox());
        monsters.forEach((monster)=> { 
            //Notice that the player can only attack monsters they overlap with, so this is a mele attack
            //Also the canAttack will get set to false after the first attack so player will only attack the first monster
            //Also the player always gets initiative, so if the player hits the monster the monster resets cooldown 
            //                                                and thus canAttack for the monster will retrun fallse
            if (this.player.isAttacking()) { 
                let playerDamage = this.player.attack(monster);
                this.overlayTexts.push( new playerDamageText(playerDamage.toString() , this.player.getLocation()) );
                if (playerDamage > 0) {
                    if (monster.takeDamage(playerDamage) <= 0) { //Did we kill the monster
                        this.storyText.addLine("You killed the " + monster.name);
                        monster.markedForDeletion = true;
                        this.dungeon.currentLevel.lootGenerator.generateJitterLoot(this.dungeon.currentLevel.items, monster.getHitBox().expand(16),1,0,0,0);
                    }
                    else {
                        this.storyText.addLine("You hit the " + monster.name + " for " + playerDamage + " damage");
                    }
                }
                else {
                    this.storyText.addLine("You missed the " + monster.name);
                }
            }
            if (monster.canAttack() && this.player.hitPoints > 0) { //If the monster can attack then it does
                monster.show(); //Make sure the monster is visible to the player.
                let damage = monster.meleAttack() - this.player.defenceModifier;
                if (damage > 0) {
                    this.overlayTexts.push( new monsterDamageText(damage , monster.getLocation()) );
                    this.storyText.addLine(monster.name + " did " + damage + " damage to you!");
                    this.player.damagePlayer(damage);
                    this.isPlayerDead("You were killed by a " + monster.name);
                }
                else {
                    this.overlayTexts.push( new monsterDamageText("0" , monster.getLocation()) );
                    this.storyText.addLine(monster.name + " attacked and missed.");
                }
            }
        })
    }

    updateItems() {
        let items = this.dungeon.currentLevel.itemCollisions(this.player.getHitBox());
        items.forEach((item, index) => {
            let  removeItem = true;
            switch(item.spriteType) {
                case "chest":
                    if (!item.isOpen) { 
                        this.dungeon.currentLevel.openChest(item);
                        this.overlayTexts.push( new statusText("Open" , item.getLocation()) );
                        this.storyText.addLine("You open a chest...");
                    }
                    removeItem = false; //Chests don't get removed
                    break;
                case "potions": 
                    this.storyText.addLine("You have collected a " + potionColorText[item.color] + " potion.");
                    this.player.addItem(item);
                    break;
                case "scrolls":
                    this.storyText.addLine("You have collected a " + scrollColorText[item.color] + " scroll.");
                    this.player.addItem(item);
                    break;
                case "gold_piles": 
                    this.storyText.addLine("You have collected " + item.Quantity + " gold.");
                    this.player.gold += item.Quantity;
                    break;
                default:
                    this.storyText.addLine("You have collected an unknown item: " + item.spriteType);
                    break;
            }
            if (removeItem) { this.dungeon.currentLevel.removeItem(item); }
        })
    }

    updateRangeAttacks(deltaTime) {
        this.rangeAttacks.forEach((missle) => {
            missle.update(deltaTime);
            let hitMosters = this.dungeon.currentLevel.monsterCollisions(missle.getHitBox());
            hitMosters.forEach((monster, index) => {
                let fireBallDamage = this.diceBag.d6() + 1;
                if (monster.takeDamage(fireBallDamage) < 0) { //Did we kill the monster
                    this.storyText.addLine("Fireball killed the " + monster.name);
                    monster.markedForDeletion = true;
                }
                else {
                    this.storyText.addLine("Fireball hit the " + monster.name + " for " + fireBallDamage + " damage");
                }
            })
            let mapTiles = this.dungeon.currentLevel.getOverlapTiles(missle.getHitBox());
            let foundSolid = false;
            mapTiles.forEach((tile) => { if (tile.solid) foundSolid = true; })
            if (foundSolid) {
                this.storyText.addLine("Fireball explodes as it hits a wall.");
                missle.markedForDeletion = true;
            }
        })
    }

    update(timeStamp) {
        let deltaTime = super.update(timeStamp);
        if (deltaTime < 1000) { //The browser pauses the animation loop when we are not the focus, so ignore large time jumps
            this.backGround.update(deltaTime);
            this.handleInput();
            this.player.update(deltaTime); //This allows the player to move and animate, but we may reset them later
            this.dungeon.update(deltaTime); //This allows all the monsters to move and animations to run
            this.dungeon.currentLevel.openHitDoor(this.player.getHitBox());
            this.dungeon.currentLevel.adjustMovingObject(this.player);
            //Dungeon maintains the animations of these, we are just checking for interactoin
            this.updateCombat();  //Monster attacks and Player Attacks
            this.updateItems();   //Pick Up Items
            //Check on fireball updates
            this.updateRangeAttacks(deltaTime); 
            this.overlayTexts.forEach((txt) => {txt.update(deltaTime);  })
            this.playerCanvas.update(deltaTime);
            if (this.fpsText != null) {
                let fps = 1000/deltaTime;
                this.fpsText.text = "FPS: " + Math.floor(fps);
            }
        }
        let playerRoom = this.dungeon.currentLevel.getRoomFromPoint(this.player.getLocation());
        if (playerRoom != null) { this.dungeon.currentLevel.showRoom(playerRoom); }
        else {
            let viewTileBox = this.player.getHitBox();
            viewTileBox.expand(31);
            this.dungeon.currentLevel.showOverlapingTiles(viewTileBox)
        }
        if (this.youDiedText != null) { this.youDiedText.update(deltaTime); }
        this.draw(this.ctx);
        return true;
    }

    isPlayerDead(message) {
        if (this.player.hitPoints <= 0) {
            this.storyText.addLine(message);
            this.youDiedText = new youDiedText("You Died!!!!", new Point(this.canvas.width/2, this.canvas.height/2));
            let top10 = this.cookie.setTop10( new HighScore(this.playerName, message, this.player.gold, null) );
            this.storyText.addLine("===============================");
            this.storyText.addLine("==========> TOP TEN <==========");
            this.storyText.addLine("===============================");
            top10.forEach((entry) => {
                this.storyText.addLine(entry.playerName + " " + entry.comment + " " + entry.score);
            })
        }
    }
    
    draw(context){
        super.draw(context);
        this.backGround.draw(context);
        this.dungeon.draw(context);
        this.overlayTexts.forEach((txt, index) => { 
            txt.draw(context); 
            if (txt.markedForDeletion) { this.overlayTexts.splice(index, 1);}
        })
        this.player.draw(context);
        this.rangeAttacks.forEach((missle, index) => { 
            missle.draw(context); 
            if (missle.markedForDeletion) {
                this.rangeAttacks.splice(index, 1);
            }
        })
        if (this.helpScreen != null) { this.helpScreen.draw(context, false);}
        if (this.youDiedText != null) { this.youDiedText.draw(context); }
        if (this.fpsText != null) { this.fpsText.draw(context); }
    }

}

