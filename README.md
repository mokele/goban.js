```javascript
var goban = XGoban('#goban', {
    stoneElement: function(color) {
        color = color.toUpperCase();
        var tile = color == 'BLACK' ? 'b' : 'w';
        return $('<img src="http://mokele.github.com/go-svg/Go_' + tile + '.svg" class="stone" />');
    },
    focusElement: function(color) {
        color = color.toUpperCase();
        var tile = color == 'BLACK' ? 'b' : 'w';
        return $('<img src="http://mokele.github.com/go-svg/Go_placed' + tile + '.svg" class="overlay"/>');
    },
    geometry: {
        width: 10, height: 10,
        points: [
            [4, 2, [3, 2, 1]], // 0
            [6, 2, [4, 5, 0]], // 1

            [2, 4, [0, 3, 6]], // 2
            [4, 4, [0, 2, 4, 7]], // 3
            [6, 4, [1, 3, 5, 8]], // 4
            [8, 4, [1, 4, 9]], // 5

            [2, 6, [2, 7, 10]], // 6
            [4, 6, [3, 6, 8, 10]], // 7
            [6, 6, [4, 7, 9, 11]], // 8
            [8, 6, [5, 8, 11]], // 9

            [4, 8, [6, 7, 11]], // 10
            [6, 8, [8, 9, 10]] // 11
        ]
    }
});
