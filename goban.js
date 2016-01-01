var Goban = function(opts) {
    this.opts = opts;
    for(var k in Goban.defaultOpts) {
        if(this.opts[k] === undefined) {
            this.opts[k] = Goban.defaultOpts[k];
        }
    }
    if(!this.opts.drawer) {
        this.opts.drawer = new Goban.drawer();
    }
    this.element = $('<div class="goban"></div>');
    this.canvas = $('<canvas width="'+opts.width+'" height="'+opts.height+'"></canvas>');
    this.element.append(this.canvas);
    this.ctx = this.canvas.get(0).getContext('2d');
    this.callbacks = {
        pointOver: $.Callbacks(),
        pointOut: $.Callbacks()
    };
    if(opts.geometry) {
        this.setGeometry(opts.geometry);
    }
    var mousemove = $.proxy(function(e) {
        var container = this.element;
        //var container = this.element.parent();
        var containerOffset = container.offset();

        var x = e.pageX - containerOffset.left;
        var y = e.pageY - containerOffset.top;
        var point = this.getPoint(x, y);
        if(point && !point.stone) {
            var diameter = point.radius * 2;
            this.callbacks.pointOver.fire(point.id);
        } else {
            this.callbacks.pointOut.fire(point.id);
        }
    }, this);
    $(document.body).mousemove($.proxy(function(e) {
        var container = this.element.parent();
        if(!container[0]) return;

        var containerOffset = container.offset();
        var pageX = e.pageX;
        var pageY = e.pageY;
        if(pageX < containerOffset.left
           || pageX > containerOffset.left + container.outerWidth()
       || pageY < containerOffset.top
       || pageY > containerOffset.top + container.outerHeight())
       {
           this.callbacks.pointOut.fire();
       } else {
           mousemove(e);
       }
    }, this));
};
Goban.prototype.setGeometry = function(geometry) {
    if(this.points) {
        this.clear();
    }
    var points = this.points = [];
    this.geometry = geometry;
    var size = this.size();
    for(var i=0; i<geometry.points.length; i++) {
        var optPoint = geometry.points[i];
        var neighbours;
        var hasXY = optPoint.length == 3 && typeof(optPoint[2]) == 'object';
        if(hasXY) {
            var x = optPoint[0];
            var y = optPoint[1];
            neighbours = optPoint[2];
        } else {
            neighbours = optPoint;
        }
        point = {
            id: i,
            neighbours: neighbours,
            elements: {}
        };
        if(hasXY) {
            //point.value = valueFun(point);
            //point.connected = connectedFun(point);
            point.originalX = x;
            point.originalY = y;
            point.x = x;
            point.y = y;
        }
        points[i] = point;
    }
    if(geometry.stars) {
        for(var i=0; i<geometry.stars.length; i++) {
            var star = geometry.stars[i];
            points[star].hasStar = true;
        }
    }
};
Goban.prototype.getNeighbours = function(id) {
    return this.points[id].neighbours.slice();
};
Goban.prototype.getStone = function(id) {
    return this.points[id].stoneValue;
};
Goban.prototype.isSameStone = function(a, b) {
    var aStone = this.getStone(a);
    var bStone = this.getStone(b);
    return Goban.utils.deepEquals(aStone, bStone);
};

Goban.prototype.getConnectedPoints = function(point, withStoneValue) {
    var seen = [point];
    var connectedPoints = [point];
    var neighbours = this.points[point].neighbours.slice(0);
    var liberties = 0;
    var pStone = withStoneValue !== undefined ? withStoneValue : this.points[point].stoneValue;
    for(var i=0; i<neighbours.length; i++) {
        var neighbour = neighbours[i];
        if(seen.indexOf(neighbour) > -1) {
            continue;
        }
        seen.push(neighbour);// definitely a better way to do this due to prior path
        var nStone = this.points[neighbour].stoneValue;
        if(nStone === undefined) {
            liberties++; // empty point
            if(pStone === undefined) {
                connectedPoints.push(neighbour);
                for(var m=0; m<this.points[neighbour].neighbours.length; m++) {
                    neighbours.push(this.points[neighbour].neighbours[m]);
                }
            }
        } else if(Goban.utils.deepEquals(nStone, pStone)) {
            connectedPoints.push(neighbour);
            for(var m=0; m<this.points[neighbour].neighbours.length; m++) {
                neighbours.push(this.points[neighbour].neighbours[m]);
            }
        }
    }
    return {
        liberties: liberties,
        points: connectedPoints
    };
};
Goban.prototype.redraw = function() {
    this.opts.drawer.redraw(this);
}

Goban.letters = ["A","B","C","D","E","F","G","H","J","K","L","M","N","O","P","Q","R","S","T"];
Goban.xToCoordLetter = function(x) {
    return Goban.letters[x];
};
Goban.xyToCoord = function(xy) {
    var number = xy.y + 1;
    return Goban.xToCoordLetter(xy.x) + number;
};
Goban.pointToCoord = function(point) {
    return Goban.xyToCoord(pointToXY(point));
};

Goban.prototype.pointOver = function(f) {
    this.callbacks.pointOver.add(f);
    return this;
};
Goban.prototype.pointOut = function(f) {
    this.callbacks.pointOut.add(f);
    return this;
};

Goban.prototype.drawCoords = function(show) {
    this.opts.coords = show;
    this.redraw();
};

Goban.prototype.hoverAndPlace = function(
    hoverName, hoverElement,
    placeName, place, placeFun
) {
    var goban = this;
    goban.pointOver(function(pointId) {
        for(var i=0; i<goban.points.length; i++) {
            var point = goban.points[i];
            goban.removeFromPoint(point.id, hoverName);
        }
        var point = goban.points[pointId];
        if(point.elements[placeName]) {
            return;
        }
        var tile = 'b';
        var hover = hoverElement();
        hover.click(function() {
            goban.removeFromPoint(pointId, hoverName);
            var placed = place();
            goban.addToPoint(pointId, placeName, placed.element, placed.stone);

            var ret = placeFun.call(this, pointId, placed.stone);
            if(ret === false) {
                goban.addToPoint(pointId, hoverName, hoverElement());
                goban.removeFromPoint(pointId, placeName, true);
            }
        });
        goban.addToPoint(pointId, hoverName, hover);
    });
    goban.pointOut(function() {
        for(var i=0; i<goban.points.length; i++) {
            var point = goban.points[i];
            goban.removeFromPoint(point.id, hoverName);
        }
    });
};


Goban.prototype.size = function() {
    if(this.opts.drawer.size) {
        return this.opts.drawer.size;
    } else {
        return Math.sqrt(this.geometry.points.length);
    }
};

Goban.prototype.getElementFromPoint = function(id, name) {
    var point = this.points[id];
    return point.elements[name];
};
Goban.prototype.addToPoint = function(id, name, element, stoneValue) {
    var point = this.points[id];
    if(point.elements[name]) {
        this.removeFromPoint(id, name);
    }
    point.elements[name] = element;
    if(stoneValue !== undefined) {
        point.stoneValue = stoneValue;
    }
    this.element.append(element);
    this.repositionPoint(point, true);
};
Goban.prototype.removeFromPoint = function(id, name, andStoneValue) {
    var point = this.points[id];
    if(!point.elements[name]) return;
    point.elements[name].remove();
    if(andStoneValue) {
        delete point.stoneValue;
    }
    delete point.elements[name];
};
Goban.prototype.removeFromAllPoints = function(name) {
    var removed = [];
    for(var i=0; i<this.points.length; i++) {
        var point = this.points[i];
        for(var k in point.elements) {
            if(!name || k == name) {
                this.removeFromPoint(point.id, k);
                removed.push(point.id);
            }
        }
    }
    return removed;
};
Goban.prototype.clear = function() {
    return this.removeFromAllPoints();
};

Goban.prototype.coordToPoint = function(coord) {
    var numPoints = this.points.length;
    var root = Math.sqrt(numPoints);
    var letter = coord.substr(0, 1);
    var number = parseInt(coord.substr(1));
    var x = Goban.letters.indexOf(letter);
    var y = root - number;
    var point = (y)*root + x;
    return point;
}
Goban.prototype.pointToXY = function(point) {
    var numPoints = this.points.length;
    var root = Math.sqrt(numPoints);
    var x = point % root;
    var number = root - ((point - (point % root)) / root);
    return {x:x, y:number-1};
};


Goban.prototype.repositionPoint = function(point, justAdded) {
    for(var k in point.elements) {
        this.repositionElement(point.elements[k], point, justAdded);
    }
};
Goban.prototype.repositionElement = function(el, point, justAdded) {
    var diameter = (point.radius * 2) + 1;
    if(!justAdded) {
        el.remove(); // weird resize fix - only likes to be resized while not on the page
    }
    el.innerWidth(diameter);
    el.innerHeight(diameter);
    var left = (point.x - point.radius) - 0.5;
    var top = (point.y - point.radius) - 0.5;
    var fontSize = point.radius;
    var textLength = el.text().length;
    if(textLength == 1) {
        fontSize *= 1.7;
    } else if(textLength == 2) {
        fontSize *= 1.4;
    } else if(textLength == 3) {
        fontSize *= 1.1;
    }
    el.css({
        fontSize: fontSize+'px',
        lineHeight: diameter+'px',
        left: left,
        top: top
    });
    this.element.append(el); // weird resize fix
};
Goban.prototype.setViewport = function() {
    this.viewport = arguments;

    var parent = this.element.parent();
    if(!parent.size()) {
        console.log('no goban parent element to alter viewport');
        return false;
    }
    var points = [];
    var pointsX = [];
    var pointsY = [];
    for(var i=0; i<arguments.length; i++) {
        var point = this.points[arguments[i]];
        pointsX.push(point.x - 1);
        pointsY.push(point.y - 1);
        points.push(point);
    }
    var minX = Math.min.apply(undefined, pointsX);
    var maxX = Math.max.apply(undefined, pointsX);
    var minY = Math.min.apply(undefined, pointsY);
    var maxY = Math.max.apply(undefined, pointsY);

    var width = (maxX+1 - minX+1) + points[0].radius*3 + 2;
    var height = (maxY+1 - minY+1) + points[0].radius*3 + 2;
    width = Math.min(width, this.originalWidth);
    height = Math.min(height, this.originalHeight);

    console.log(minX, maxX, minY, maxY);
    parent.width(width);
    console.log(width, height);
    parent.height(height);
    //this.element.css({top: minY, bottom: maxY, left: minX, right: maxX});
    var right = this.originalWidth - (maxX+1);
    console.log(right);
    this.element.css({top: 0, right: 0});

    // TODO alter width/height of parent()
    // and change top,right,bottom,left of this.element
};
Goban.prototype.recalculateSize = function() {
    var width = this.element.parent().innerWidth();
    var height = this.element.parent().innerHeight();
    if(!this.originalWidth) {
        this.originalWidth = width;
        this.originalHeight = height;
    }
    var max = Math.max(width, height);
    this.width = max;
    this.height = max;
    this.element.css({
        width: this.width,
        height: this.height
    });
    this.canvas.attr('width', this.width);
    this.canvas.attr('height', this.height);

    this.opts.drawer.recalculateSize(this);
};

Goban.prototype.fit = function() {
    this.recalculateSize();
    this.redraw();
}

Goban.prototype.getPoint = function(x, y) {
    // todo: sort points by x and y coord
    // so we when when to stop searching
    for(var i=0; i<this.points.length; i++) {
        var point = this.points[i]
        var hitArea = point.hitArea;
        if(x >= hitArea.x && y >= hitArea.y
           && x <= hitArea.x2 && y <= hitArea.y2)
       {
           return point;
       }
    }
    return false;
};
Goban.prototype.setDrawer = function(drawer) {
    this.opts.drawer = drawer;
};


Goban.drawer = function(opts) {
    this.opts = opts;
    for(var k in Goban.drawer.defaultOpts) {
        if(this.opts[k] === undefined) {
            this.opts[k] = Goban.drawer.defaultOpts[k];
        }
    }
    if(typeof this.opts.lineWidth != 'function') {
        var lineWidth = this.opts.lineWidth;
        this.opts.lineWidth = function(_,_) {
            return lineWidth;
        }
    }
    if(typeof this.opts.strokeStyle != 'function') {
        var strokeStyle = this.opts.strokeStyle;
        this.opts.strokeStyle = function(_,_) {
            return strokeStyle;
        }
    }
}
Goban.drawer.defaultOpts = {
    coordFontFamily: 'Arial',
    lineWidth: 0.5,
    coordStyle: '#333',
    coords: true,
    strokeStyle: '#333',
    starStyle: '#333',
    stars: true,
    exteriorLines: true,
    padding: 0
};
Goban.drawer.prototype.recalculateSize = function(goban) {
    this.recalculatePointPositions(goban);
    this.recalculatePointRadius(goban);
};
Goban.drawer.prototype.recalculatePointRadius = function(goban) {
    var minDistance = false;
    for(var i=0; i<goban.points.length; i++) {
        var point = goban.points[i];
        for(var j=0; j<point.neighbours.length; j++) {
            var neighbour = goban.points[point.neighbours[j]];
            var diffx = Math.abs(point.x - neighbour.x);
            var diffy = Math.abs(point.y - neighbour.y);
            var distance = Math.sqrt(diffx*diffx + diffy*diffy);
            minDistance = minDistance===false ? distance : Math.min(minDistance, distance);
        }
    }
    var pointRadius = (minDistance) / 2 - 0.4;
    for(var i=0; i<goban.points.length; i++) {
        var point = goban.points[i];
        var x = point.x;
        var y = point.y;
        var hitArea = {
            x: x - pointRadius,
            y: y - pointRadius,
            x2: x + pointRadius,
            y2: y + pointRadius
        };
        point.originalHitArea = {
            x: hitArea.x,
            y: hitArea.y,
            x2: hitArea.x2,
            y2: hitArea.y2
        };
        point.hitArea = hitArea;
        point.originalRadius = pointRadius;
        point.radius = pointRadius;
        goban.repositionPoint(point);
    }
};

Goban.drawer.prototype.recalculatePointPositions = function(goban) {
    var drawingWidth = goban.width;
    var drawingHeight = goban.height;
    //var lineWidthAddition = this.opts.lineWidth < 1
    //    ? Math.ceil(this.opts.lineWidth)
    //    : Math.round(this.opts.lineWidth);
    var lineWidthAddition = 1;
    if(this.opts.exteriorLines) {
        drawingWidth -= lineWidthAddition;
        drawingHeight -= lineWidthAddition;
    } else {
        drawingWidth += lineWidthAddition;
        drawingHeight += lineWidthAddition;
    }
    var geometryWidth = goban.geometry.width;
    var geometryHeight = goban.geometry.height;
    geometryWidth += this.opts.padding*4;
    geometryHeight += this.opts.padding*4;
    if(this.opts.coords) {
        geometryWidth += 6;
        geometryHeight += 6;
    }

    var ratioX = drawingWidth / geometryWidth;
    var ratioY = drawingHeight / geometryHeight;
    for(var i=0; i<goban.points.length; i++) {
        var point = goban.points[i];

        var originalX = point.originalX;
        var originalY = point.originalY;

        if(this.opts.coords) {
            originalX += 3;
            originalY += 3;
        }
        originalX += this.opts.padding*2;
        originalY += this.opts.padding*2;

        point.x = originalX * ratioX;
        if(this.opts.exteriorLines) {
            point.x += lineWidthAddition;
        }
        point.x = Math.round(point.x*2)/2;
        if((point.x/0.5) % 2 == 1) {
            point.x += 0.5;
        }
        point.y = originalY * ratioY;
        if(this.opts.exteriorLines) {
            point.y += lineWidthAddition;
        }
        point.y = Math.round(point.y*2)/2;
        if((point.y/0.5) % 2 == 1) {
            point.y += 0.5;
        }
        /*point.radius = point.originalRadius * ratio;
          point.hitArea.x = point.originalHitArea.x * ratio;
          point.hitArea.y = point.originalHitArea.y * ratio;
          point.hitArea.x2 = point.originalHitArea.x2 * ratio;
          point.hitArea.y2 = point.originalHitArea.y2 * ratio;
          */
        goban.repositionPoint(point);
    }
}
Goban.drawer.prototype.redraw = function(goban) {
    var ctx = goban.ctx;
    //ctx.translate(0.5, 0.5);
    ctx.strokeStyle = this.opts.strokeStyle;
    ctx.fillStyle = this.opts.strokeStyle;

    //ctx.lineWidth = this.opts.lineWidth;

    ctx.clearRect(0, 0, goban.width, goban.height);
    var lines = {};
    for(var i=0; i<goban.points.length; i++) {
        var point = goban.points[i];
        if(this.opts.coords) {
            ctx.fillStyle = this.opts.coordStyle;
            var fontSize = point.radius;
            ctx.font = fontSize+'px '+this.opts.coordFontFamily;
            var xy = goban.pointToXY(point.id);
            if(xy.y+1 == goban.size() || xy.y == 0) {
                var coordLetter = Goban.xToCoordLetter(xy.x);
                var metrics = ctx.measureText(coordLetter);
                var x = point.x - (metrics.width/2);
                var offset = xy.y == 0 ? point.radius+(fontSize*1.05) : 0-point.radius-(fontSize*0.2)-2;
                var y = point.y + offset;
                ctx.fillText(coordLetter, x, y);
            }
            if(xy.x+1 == goban.size() || xy.x == 0) {
                var number = xy.y+1+''
                var metrics = ctx.measureText(number);
                var halfWidth = metrics.width/2;
                var halfRadius = point.radius/2;
                var offset = xy.x == 0 ? -(point.radius*1.2)-halfRadius-2 : (point.radius*1.2)+halfRadius;
                var x = point.x + offset - halfWidth;
                var y = point.y+(fontSize/3);
                ctx.fillText(xy.y+1, x, y);
            }
        }

        var drawTheseStars = [];
        if(point.hasStar && this.opts.stars) {
            drawTheseStars.push(point);
        }

        for(var j=0; j<point.neighbours.length; j++) {
            var neighbour = goban.points[point.neighbours[j]];
            var key = Math.min(point.id, neighbour.id)
            + 'x' + Math.max(point.id, neighbour.id);
            if(!lines[key]) {
                lines[key] = true
                ctx.beginPath();
                ctx.lineWidth = this.opts.lineWidth(point.id, neighbour.id);
                ctx.strokeStyle = this.opts.strokeStyle(point.id, neighbour.id);

                ctx.moveTo(point.x-0.5, point.y-0.5);
                ctx.lineTo(neighbour.x-0.5, neighbour.y-0.5);
                ctx.closePath();
                ctx.stroke();
            }
        }
        for(var j=0; j<drawTheseStars.length; j++) {
            var point = drawTheseStars[j];
            ctx.beginPath();
            ctx.arc(point.x-0.5, point.y-0.5, point.radius*0.20, 0, 2 * Math.PI, false);
            ctx.fillStyle = this.opts.starStyle;
            ctx.fill();
        }
    }
}



Goban.geometry = {
    square: function(size) {
        var points = [];
        var height = (size-1)*2;
        var width = (size-1)*2;
        var neighbours = function(x, y, i) {
            var points = [];
            if(y != 0) {
                points.push(i - size);
            }
            if(x != 0) {
                points.push(i - 1);
            }
            if(x != size - 1) {
                points.push(i + 1);
            }
            if(y != size - 1) {
                points.push(i + size);
            }
            return points;
        };
        for(var y=0, i=0; y<size; y++) {
            for(var x=0; x<size; x++, i++) {
                points.push([x*2, y*2, neighbours(x, y, i)]);
            }
        }
        var stars = [];
        if(size==9) {
            stars = [20, 24, 56, 60];
        } else if(size==13) {
            stars = [42,45,48,81,84,87,120,123,126];
        } else if(size==19) {
            stars = [294,300,186,180,174,288,66,72,60];
        }
        return {
            width: width, height: height,
            points: points,
            stars: stars
        };
    }
};

Goban.utils = {};
Goban.utils.deepEquals = function(a, b) {
    var type = typeof(a);
    if(a === null && b === null) {
        return true;
    } else if(a === null || b === null) {
        return false;
    }
    if(type != typeof(b)) {
        return false;
    }
    if(type == 'object') {
        if(a.length !== b.length) {
            return false
        }
        if(a.length === undefined) {
            var aKeys = Object.keys(a);
            var bKeys = Object.keys(b);
            if(Object.keys(a).length != Object.keys(b).length) {
                return false;
            }
            for(var k in a) {
                if(!Goban.utils.deepEquals(a[k], b[k])) {
                    return false;
                }
            }
            return true;
        } else {
            for(var i=0; i<a.length; i++) {
                if(!Goban.utils.deepEquals(a[i], b[i])) {
                    return false;
                }
            }
            return true;
        }

    }
    return a == b;
};
Goban.utils.isBoxEdge = function(size, x0, x1, y0, y1) {
    var left = x0 % size;
    var right = x1 % size;
    return function(a, b) {
        var aMod = a % size;
        var bMod = b % size;
        var lastRow = size*(size-1) - 1;
        return (aMod == left && bMod == left && a >= x0 && a < y0)
        || (a >= x0 && a <= x1 && b >= x0 && b <= x1)
        || (a >= y0 && a <= y1 && b >= y0 && b <= y1)
        || (aMod == right && bMod == right && a >= x1 && a < y1);
    };
};
Goban.utils.isEdge = function(size) {
    var points = size * size;
    var maxPoint = points - 1;
    var lastRow = points - size;
    // TODO fix for non-19x19
    //return Goban.utils.isBoxEdge(size, 0, 18, lastRow, maxPoint);
    return function(a, b) {
      var aMod = a % size;
      var bMod = b % size;
      var lastRow = size*(size-1) - 1;
      return (aMod == 0 && bMod == 0)
          || (aMod == size-1 && bMod == size-1)
          || (a > lastRow && b > lastRow)
          || (a < size && b < size);
    };
};
