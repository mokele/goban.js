```javascript
var goban = new Goban({
  drawer: new Goban.drawer({showCoords: true}),
  geometry: Goban.geometry.square(19)
});
var tile = 'b';
goban.hoverPlaceAndFocus(
  'ghost', function() {
    return $('<img src="http://mokele.github.com/go-svg/Go_' + tile + '.svg" class="ghost"/>');
  },
  'stone', function() {
    return $('<img src="http://mokele.github.com/go-svg/Go_' + tile + '.svg" class="stone"/>');
  },
  'focused', function() {
    return $('<img src="http://mokele.github.com/go-svg/Go_placed' + tile + '.svg" class="focused"/>');
  },
  function(pointId) {
    tile = tile=='b'?'w':'b';
  }
);
$('#goban').append(goban.element);
```
