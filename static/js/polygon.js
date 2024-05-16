function drawPolygon() {
    context.fillStyle = 'rgba(249, 125, 94, 0.3)';
    context.strokeStyle = "#df4b26";
    context.lineWidth = 1;

    context.beginPath();
    let firstPoint = null
    for (const key of order) {
        if (points[key] !== undefined) {
            firstPoint = points[key];
            break;
        }
    }
    context.moveTo(firstPoint[0], firstPoint[1]);
    for (const key of order) {
        if (points[key] === undefined) {
            continue;
        }
        context.lineTo(points[key][0], points[key][1]);
    }
    context.closePath();
    context.fill();
    context.stroke();
}

function drawPoints(){
    context.strokeStyle = "#df4b26";
    context.lineJoin = "round";
    context.lineWidth = 5;

    for (const key of order) {
        if (points[key] === undefined) {
            continue;
        }
        context.beginPath();
        context.arc(points[key][0], points[key][1], 3, 0, 2 * Math.PI, false);
        context.fillStyle = '#ffffff';
        context.fill();
        context.lineWidth = 5;
        context.stroke();
    }
}

function redraw(){
    canvas.width = canvas.width; // Clears the canvas
    context.drawImage(img, 0, 0, width, height);

    drawPolygon();
    drawPoints();
}

