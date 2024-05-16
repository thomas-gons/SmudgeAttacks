const width = 640, height = 640;
const midWidth = width / 2, midHeight = height / 2;
let context = null;
let img = new Image()
let points = {};
let order = ["tl", "tr", "br", "bl"];
let canvas = null;

$(document).ready(function() {

    $("#image").change(function() {
        const reader = new FileReader();
        const file = this.files[0];
        const formData = new FormData();
        formData.append("image", file);

        $.ajax({
            url: "/detect_phone",
            enctype: 'multipart/form-data',
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            xhrFields: {
                responseType: 'application/json'
            },
            success: function (response) {
                $("#preview").css("visibility", "visible");
                // load the base64 image
                img.src = `data:image/png;base64,${response.image}`;
                canvas = $("#image-preview")[0];
                context = canvas.getContext("2d");
                canvas.width = width;
                canvas.height = height;
                img.onload = () => {
                    context.drawImage(img, 0, 0, width, height);
                    points = response.boxes;
                    redraw();
                }
                $("#submit-form").css("visibility", "visible");
            },
        })
    });

    $("#image-preview").click((event) => {
        const x = event.offsetX, y = event.offsetY;
        const quadrants = {
            tl: x < midWidth && y < midHeight,
            tr: x > midWidth && y < midHeight,
            bl: x < midWidth && y > midHeight,
            br: x > midWidth && y > midHeight
        }

        for (const key in quadrants) {
            if (quadrants[key]) {
                points[key] = [x, y];
                break;
            }
        }
        redraw();
    })


    $("#brightness").on("input", function() {
        // change the brightness of the image
        const brightness = $(this).val();
        $("#image-preview").css("filter", `brightness(${brightness}%)`);

    });

    $("#image-form").submit(function (e) {
        e.preventDefault();

        if (points.length < 4)
            return;

        const formData = new FormData(this);
        // remove `data:image/png;base64, from the image src`
        formData.append("image", img.src.split(',')[1]);
        formData.append("points", JSON.stringify(points));

        $.ajax({
            url: "/process",
            enctype: 'multipart/form-data',
            type: "POST",
            data: formData,
            processData: false,
            contentType: false,
            xhrFields: {
                responseType: 'blob'
            },
            success: function (response) {
                let urlCreator = window.URL || window.webkitURL;
                let imgURL = urlCreator.createObjectURL(response);
                $("#brightness").val(100);
                $("#image-preview").css("filter", "brightness(100%)")
                                   .off("click")

                let img = new Image();
                img.onload = function() {
                    context.drawImage(img, 0, 0, width, height);
                }
                img.src = imgURL;
            }
        });
    });
});