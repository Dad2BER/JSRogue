import { MovingSprite } from "../sprite_classes/movingSprite.js";
import { Sprite } from "../sprite_classes/sprite.js";
import { debugText } from "../text.js";
import { RandomNumber, direction, sidedDice, Point } from "./utilities.js";

export const monsterType = {RAT: 'rats', TROLL: 'trolls',GIANT: 'giants', ORC: 'orcs', DRAGON: 'dragons'};
export const ratSubtype = {BROWN: 0, GREEN: 1, GREY: 2, ORANGE: 3, RED: 4};
export const ratSubtypeNames = ["Brown", "Green", "Grey", "Orange", "Red"];
export const trollSubtype = {NORMAL: 0, DEEP: 1, BERSERKER: 2, MAGE: 3, SHAMAN: 4, IRON: 5, MOON: 6, ROCK: 7}
export const trollSubtypeNames = ["Normal", "Deep", "Berserker", "Mage", "Shaman", "Iron", "Moon", "Rock"];
const diceBag = new RandomNumber();

class Monster extends MovingSprite{
    constructor(x,y,type,subtype, speed, hitPoints, meleDamage, coolDown) {
        super(new Sprite(type,x,y,32,32,subtype,0,0), new Sprite(type,x,y,32,32,subtype,0,0), 
              new Sprite(type,x,y,32,32,subtype,0,0), new Sprite(type,x,y,32,32,subtype,0,0), 
              direction.LEFT,speed);
        this.wander = false;
        this.markedForDeletion = false;
        this.coolDownValue = coolDown; //This value should be overriddent for each monster
        this.attackCoolDown = this.coolDownValue;
        this.hitPoints = hitPoints;
        this.meleDamage = meleDamage;
        this.type = type;
        this.subtype = subtype;
        this.name = "";
        switch(this.type) {
            case monsterType.RAT: this.name = ratSubtypeNames[subtype] + " Rat"; break;
            case monsterType.TROLL: this.name = trollSubtypeNames[subtype] + " Troll"; break;
            case monsterType.GIANT: this.name = "Giant"; break;
            case monsterSpeed.ORC: this.name = "Orc"; break;
            case monsterType.DRAGON: this.name = "Dragon"; break;
            default: this.name = "Unknown"; break;
        }
        this.debugTxt = new debugText("Debug", new Point(x,y));
        //this.debugTxt = null;
    }

    update(deltaTime) {
        super.update(deltaTime);
        this.attackCoolDown -= deltaTime;
        if (this.attackCoolDown < 0 ) { this.attackCoolDown = 0; }
        if (this.debugTxt != null) {
            this.debugTxt.location.x = this.x;
            this.debugTxt.location.y = this.y;
        }
    }

    draw(context) {
        super.draw(context, false);
        if (this.debugTxt != null  && this.isVisible()) {
            this.debugTxt.text = this.hitPoints + " : " + this.meleDamage;
            this.debugTxt.draw(context);
        }
    }

    canAttack() {
        return this.attackCoolDown <= 0;
    }

    meleAttack() {
        this.attackCoolDown = this.coolDownValue;
        return this.meleDamage;
    }

    rangeAttack() {
        return this.rangeDamage;
    }

    setRandomDirection() {
        this.setDirection(diceBag.d4() - 1); //Directions are 0 based and d4 is 1 to 4
    }

    takeDamage(damage) {
        if (this.hitPoints<10 || diceBag.d4() == 1) { //25% the damage causes stun
            this.attackCoolDown += this.coolDownValue;
        }
        this.hitPoints -= damage;
        return this.hitPoints;
    }

}    

const monsterSpeed = {RAT: 20, TROLL: 15, GIANT: 15, ORC: 17, DRAGON: 25};
export class rat extends Monster{ constructor(x,y,subtype) { super(x,y,
                 monsterType.RAT,subtype, monsterSpeed.RAT, 
                 diceBag.roll(1, sidedDice.d4)+subtype, diceBag.roll(1, sidedDice.d4), 1000); }}
export class troll extends Monster{ constructor(x,y,subtype) { super(x,y,
                 monsterType.TROLL, subtype, monsterSpeed.TROLL,
                 diceBag.roll(subtype+1, sidedDice.d4), diceBag.roll(subtype+1, sidedDice.d4), 2000); }}
export class giant extends Monster{ constructor(x,y,subtype) { super(x,y,
                 monsterType.GIANT, subtype, monsterSpeed.GIANT,
                 diceBag.roll(subtype+1, sidedDice.d8), diceBag.roll(subtype+2, sidedDice.d4), 1500); }}
export class orc extends Monster{ constructor(x,y,subtype) { super(x,y,
                 monsterType.ORC, subtype, monsterSpeed.ORC,
                 diceBag.roll(subtype+1, sidedDice.d6), diceBag.roll(1, sidedDice.d10)+subtype, diceBag.intBetween(500, 1500)); }}
export class dragon extends Monster{ constructor(x,y,subtype) { super(x,y,
                monsterType.DRAGON, subtype, monsterSpeed.DRAGON,
                diceBag.roll((subtype+1), sidedDice.d10), diceBag.roll(subtype+2, sidedDice.d10), diceBag.intBetween(10,300)); }}

