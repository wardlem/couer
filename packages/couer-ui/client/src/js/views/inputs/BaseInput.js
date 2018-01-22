function BaseInput(input, def) {
    input.hideif = input.hideif || def.hideif || null;

    return input;
}

module.exports = BaseInput;
