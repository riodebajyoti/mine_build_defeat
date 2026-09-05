const FOOD_VALUES = {
    'Apple': [8, 12], 'Bread': [6, 18], 'Cookie': [3, 8], 'Cake': [12, 20],
    'Carrot': [5, 12], 'Golden Carrot': [12, 28], 'Potato': [3, 7],
    'Baked Potato': [7, 18], 'Beetroot': [4, 9], 'Melon Slice': [4, 10],
    'Cooked Chicken': [10, 24], 'Cooked Beef': [14, 30], 'Cooked Porkchop': [14, 30],
    'Cooked Mutton': [12, 26], 'Cooked Rabbit': [10, 22], 'Cooked Cod': [9, 20],
    'Cooked Salmon': [11, 24], 'Pumpkin Pie': [10, 24], 'Sweet Berries': [4, 8],
    'Glow Berries': [4, 16], 'Dried Kelp': [2, 7], 'Honey Bottle': [6, 20],
    'Beetroot Soup': [10, 22], 'Mushroom Stew': [10, 22], 'Rabbit Stew': [14, 30]
};

export function isFood(itemName) {
    return Boolean(FOOD_VALUES[itemName] || ['Golden Apple', 'Enchanted Golden Apple', 'Suspicious Stew', 'Milk Bucket'].includes(itemName));
}

export function consumeFood(state, item) {
    if (!item || item.count < 1 || !isFood(item.name)) return false;

    let [health, energy] = FOOD_VALUES[item.name] || [0, 0];
    let message = `Ate ${item.name}: +${health} health, +${energy} energy`;

    if (item.name === 'Golden Apple') {
        health = 40; energy = 35;
        state.addEffect('Resistance', 30, 0.5);
        message = 'Golden Apple: regeneration and 30s resistance!';
    } else if (item.name === 'Enchanted Golden Apple') {
        health = 100; energy = 100;
        state.addEffect('Resistance', 60, 0.25);
        message = 'Enchanted Golden Apple: full restore and 60s strong resistance!';
    } else if (item.name === 'Suspicious Stew') {
        health = Math.random() < 0.75 ? 18 : -8;
        energy = health > 0 ? 24 : 0;
        message = health > 0 ? 'The stew gave you regeneration!' : 'The stew was poisonous!';
    } else if (item.name === 'Milk Bucket') {
        state.clearEffects();
        health = 0; energy = 8;
        message = 'Milk cleared all special effects.';
    }

    item.count -= 1;
    state.setHP(state.hp + health);
    state.setEnergy(state.energy + energy);
    state.showHelperMsg(message);
    return true;
}
