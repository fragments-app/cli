
//private function
const _onlyUnique = (self) => { 
    return self.filter((el, _, arr) => {
        return arr.filter(el2 => el2 === el).length === 1
    })
}

//publis functions
const unique = (arr) => { return _onlyUnique(arr) }

module.exports = { unique };