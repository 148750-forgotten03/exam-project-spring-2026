let player: Sprite = null
let isFacingLeft = false
let hasPowerUp = false
let invincibilityPeriod = 500
let currentLevel = 1
let startTime = 0

namespace SpriteKind {
    export const Skeleton = SpriteKind.create()
    export const Spike = SpriteKind.create()
    export const Crusher = SpriteKind.create()
}

function startGame() {
    info.setLife(3) // if this is inside setUpPlayer, then you'll reset extra lives between levels
    setUpPlayer()
    setUpTileMap()
    setUpEnemies()
    setUpStory()
}

function setUpPlayer() {
    player = sprites.create(assets.image`player_standing_right`, SpriteKind.Player)
    player.setPosition(20, 172)
    controller.moveSprite(player, 80, 0)
    scene.cameraFollowSprite(player)
    jump(player)
}

function setUpEnemies() {
    runSpawner(assets.tile`skeleton_spawn`, assets.image`skeleton`, SpriteKind.Skeleton)
    runSpawner(assets.tile`spike_spawn`, assets.image`spike`, SpriteKind.Spike)
    runSpawner(assets.tile`crusher_spawn`, assets.image`crusher_trap`, SpriteKind.Crusher)
    //TODO:  Add a runSpawner for the other enemy type here

    setUpSkellies() //This adds gravity to all skellies
    setUpCrushers() //This runs animates all of the crushers
}

function setUpTileMap() {
    switch (currentLevel) {
        case 1:
            scene.setBackgroundColor(12)
            tiles.setCurrentTilemap(tilemap`level3`)
            break
        case 2:
            scene.setBackgroundColor(15)
            multilights.toggleLighting(true) //turns the lights off
            tiles.setCurrentTilemap(tilemap`level2`)
            break
        case 3:
            multilights.toggleLighting(false) //turns the lights on
            tiles.setCurrentTilemap(tilemap`test_level`) //TODO: Change the tilemap called 'level3' to match the requirements
            break
        default:
            game.gameOver(true) //if you move beyond the last level you probably won
    }
}

function setUpNextLevel() {
    clearGame()
    currentLevel++
    setUpPlayer()
    setUpTileMap()
    setUpEnemies()
    addLighting()
}

function setUpStory() {
    game.showLongText(`You wake up in a dark, dismal dungeon... You are alone and you can't remember anything.`, DialogLayout.Full)
}

function setUpSkellies() {
    let skellies = sprites.allOfKind(SpriteKind.Skeleton)
    skellies.forEach(function(skelly) {
        skelly.ay = 100
    })
}

function setUpCrushers() {
    let crushers = sprites.allOfKind(SpriteKind.Crusher)
    crushers.forEach(function(crusher) {
        let y = crusher.y //because the crusher has an unusual height, it needs its default y to be lowered
        crusher.y = y + 8
        animation.runImageAnimation(crusher, assets.animation`crusher_trap_animation`, 50, true)
    })
}

function jump(sprite: Sprite, j?: number, g?: number) {
    const grav = g || 220
    const jump_const = j || -100
    sprite.ay = jump_const
    sprite.vy = jump_const
    while (sprite.ay < grav) {
        sprite.ay += Math.abs(sprite.vy)
    }
    sprite.ay = grav
}

function runSpawner(spawnTile: Image, spriteImage: Image, spriteType: any) {
    let spawns = tiles.getTilesByType(spawnTile)
    spawns.forEach((spawn) => {
        let sprite = sprites.create(spriteImage, spriteType)
        sprite.setPosition(spawn.x, spawn.y)
    })
}

function runSkeletonAI(enemy: Sprite) {
    if (enemy.vx == 0 && enemy.isHittingTile(CollisionDirection.Left)) {
        enemy.vx = 60
        animation.runImageAnimation(enemy, assets.animation`skeleton_walking_right`, 100, true)
    } else if (enemy.vx == 0 && enemy.isHittingTile(CollisionDirection.Right)) {
        enemy.vx = -60
        animation.runImageAnimation(enemy, assets.animation`skeleton_walking_left`, 100, true)
    } else if (enemy.vx == 0) {
        enemy.vx = 60 //handles the case wh  ere they just spawned
    } else if (enemy.vx < 0 && !enemy.isHittingTile(CollisionDirection.Bottom)){
        enemy.vx = 60
        enemy.x += 2
        animation.runImageAnimation(enemy, assets.animation`skeleton_walking_right`, 100, true)
    } else if (enemy.vx > 0 && !enemy.isHittingTile(CollisionDirection.Bottom)){
        enemy.vx = -60
        enemy.x -= 2
        animation.runImageAnimation(enemy, assets.animation`skeleton_walking_left`, 100, true)
    }
}

//This runs everytime we switch levels. It's important to remove all existing sprites between levels
function clearGame() {
    for (let sprite of sprites.allOfKind(SpriteKind.Skeleton)) {
        sprite.destroy()
    }
    for (let sprite of sprites.allOfKind(SpriteKind.Spike)) {
        sprite.destroy()
    }
    for (let sprite of sprites.allOfKind(SpriteKind.Crusher)) {
        sprite.destroy()
    }
    for (let sprite of sprites.allOfKind(SpriteKind.Player)) {
        sprite.destroy()
    }
}

function addLighting() {
    multilights.addLightSource(player, 17)
    multilights.flashlightSourceAttachedTo(player)
}

/***********************
 * Timer Update Triggers
 **********************/

//This triggers every frame (24fps), so 24 times per second
game.onUpdate(function () {
    let skeletons = sprites.allOfKind(SpriteKind.Skeleton)
    skeletons.forEach((skeleton) => {
        runSkeletonAI(skeleton)
    })
})

//This triggers on an interval of 1000ms, or whatever you change the first paramater to
game.onUpdateInterval(1000, function() {
    //does nothing right now
})

/**=======================
 * Sprite Overlap Triggers
 =======================*/

sprites.onOverlap(SpriteKind.Player, SpriteKind.Skeleton, function (player, enemy) {
    if (player.vy > 0 && !(player.isHittingTile(CollisionDirection.Bottom)) || player.y < enemy.top) {
        info.changeScoreBy(1)
        sprites.destroy(enemy)
        jump(player)
    } else {
        info.changeLifeBy(-1)
        player.startEffect(effects.spray, invincibilityPeriod)
        music.play(music.melodyPlayable(music.powerDown), music.PlaybackMode.UntilDone)
        pause(invincibilityPeriod)
    }
})

sprites.onOverlap(SpriteKind.Player, SpriteKind.Crusher, function (player, crusher){
    game.gameOver(false)
})

sprites.onOverlap(SpriteKind.Player, SpriteKind.Spike, function (player, spike) {
    game.gameOver(false)
})

sprites.onOverlap(SpriteKind.Skeleton, SpriteKind.Projectile, function(skelly, projectile){
    sprites.destroy(skelly)
    sprites.destroy(projectile)
})

/**=====================
 * Tile Overlap Triggers
 =====================*/
scene.onOverlapTile(SpriteKind.Player, assets.tile`redOrb`, function (sprite: Sprite, location: tiles.Location) {
    info.changeScoreBy(1)
    tiles.setTileAt(location, assets.tile`empty`)
})

scene.onOverlapTile(SpriteKind.Player, assets.tile`power_up`, function (sprite: Sprite, location: tiles.Location) {
    hasPowerUp = true
    tiles.setTileAt(location, assets.tile`empty`)
    game.splash('You feel yourself getting stronger...')
    game.splash('Press A to shoot a projectile')
})

scene.onOverlapTile(SpriteKind.Player, assets.tile`jump pad`, function (sprite: Sprite, location: tiles.Location) {
    jump(player, -195)
})

scene.onOverlapTile(SpriteKind.Player, assets.tile`chest_closed_tile`, function (sprite: Sprite, location: tiles.Location) {
    tiles.setTileAt(location, assets.tile`chest_open_tile`)
    game.splash('You find some health')
    info.changeLifeBy(1)
})

scene.onOverlapTile(SpriteKind.Player, assets.tile`portal`, function (sprite: Sprite, location : tiles.Location) {
    setUpNextLevel() //move on to the next level, or end the game
})

scene.onOverlapTile(SpriteKind.Player, assets.tile`grass_left`, function (sprite: Sprite, location: tiles.Location) {
    game.gameOver(false)
})

scene.onOverlapTile(SpriteKind.Player, assets.tile`grass_middle`, function (sprite: Sprite, location: tiles.Location) {
    game.gameOver(false)
})

scene.onOverlapTile(SpriteKind.Player, assets.tile`grass_right`, function (sprite: Sprite, location: tiles.Location) {
    game.gameOver(false)
})

scene.onOverlapTile(SpriteKind.Projectile, assets.tile`grass_left`, function (sprite: Sprite, location: tiles.Location) {
    tiles.setTileAt(location, assets.tile`empty`)
    sprites.destroy(sprite)
})

scene.onOverlapTile(SpriteKind.Projectile, assets.tile`grass_middle`, function (sprite: Sprite, location: tiles.Location) {
    tiles.setTileAt(location, assets.tile`empty`)
    sprites.destroy(sprite)
})

scene.onOverlapTile(SpriteKind.Projectile, assets.tile`grass_right`, function (sprite: Sprite, location: tiles.Location) {
    tiles.setTileAt(location, assets.tile`empty`)
    sprites.destroy(sprite)
})

startGame()

/**===================
 * Controller Triggers
 ===================*/
controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
    if (!controller.left.isPressed()) {
        animation.runImageAnimation(player, assets.animation`player_walking_right`, 200, true)
        isFacingLeft = false
    }
})

controller.right.onEvent(ControllerButtonEvent.Released, function () {
    if (!controller.left.isPressed()) {
        animation.stopAnimation(animation.AnimationTypes.All, player)
    }
})

controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
    if (!controller.right.isPressed()) {
        animation.runImageAnimation(player, assets.animation`player_walking_left`, 200, true)
        isFacingLeft = true
    }
})

controller.left.onEvent(ControllerButtonEvent.Released, function () {
    if (!controller.right.isPressed()) {
        animation.stopAnimation(animation.AnimationTypes.All, player)
    }
})

controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    if (player.vy == 0 && isFacingLeft) {
        animation.runImageAnimation(player, assets.animation`player_jumping_left`, 100, false)
        jump(player)
    } else if (player.vy == 0 && !isFacingLeft) {
        animation.runImageAnimation(player, assets.animation`player_jumping_right`, 100, false)
        jump(player)
    }
})

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    if (currentLevel > 1 && info.score() > 0 && hasPowerUp) {
        info.changeScoreBy(-1)
        if(isFacingLeft){
            let projectile = sprites.createProjectileFromSprite(img`
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . 2 2 . . . . . . .
            . . . . . . 3 1 1 3 . . . . . .
            . . . . . 2 1 1 1 1 2 . . . . .
            . . . . . 2 1 1 1 1 2 . . . . .
            . . . . . . 3 1 1 3 . . . . . .
            . . . . . . . 2 2 . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
        `, player, -75, 0)
        } else {
            let projectile = sprites.createProjectileFromSprite(img`
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . 2 2 . . . . . . .
            . . . . . . 3 1 1 3 . . . . . .
            . . . . . 2 1 1 1 1 2 . . . . .
            . . . . . 2 1 1 1 1 2 . . . . .
            . . . . . . 3 1 1 3 . . . . . .
            . . . . . . . 2 2 . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
            . . . . . . . . . . . . . . . .
        `, player, 75, 0)
        }
    }
})