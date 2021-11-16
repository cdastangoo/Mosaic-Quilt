// input images list
let input_image_names = [
  'Mona Lisa',
  'Parrots',
  'Skyline',
	'Forest',
  'Orbs',
  'Cubes',
  'Graffiti',
  'Pond',
  'Galaxy',
  'Buildings'
];
// image urls list
let input_image_urls = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/483px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/8/88/Eclectus_roratus-20030511.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Hong_Kong_Harbour_Night_2019-06-11.jpg/1280px-Hong_Kong_Harbour_Night_2019-06-11.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/2/2d/Picea_glauca_taiga.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/7/70/Juliasetsdkpictfield3.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Habitat_67%2C_southwest_view.jpg/1080px-Habitat_67%2C_southwest_view.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/6/6d/P1060341komp.JPG',
  'https://upload.wikimedia.org/wikipedia/commons/8/8a/Buki.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ce/M82_HST_ACS_2006-14-a-large_web.jpg/924px-M82_HST_ACS_2006-14-a-large_web.jpg',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6b/Boston_backbay_brownstones.jpg/1080px-Boston_backbay_brownstones.jpg',
];

let input_images = [];
let input = null;
let output = null;

let mosaic_names = ['Albums', 'Films'];
let mosaic_urls = ['https://i.imgur.com/sdGu5Tw.png', 'https://i.imgur.com/jcmMGls.png'];
let mosaic_img_size = [[12, 12], [12, 23]];
let mosaic_nimages = [599, 951];
let mosaic_montages = [];
let mosaics = [];

// adjust brightness
function brighten(input, output, brightness) {
	let ip = input.pixels;
	let op = output.pixels;
	for (let i = 0; i < input.width * input.height; i++)	{
		let idx = i * 4;
		op[idx+0] = pixelClamp(ip[idx+0] * brightness);
		op[idx+1] = pixelClamp(ip[idx+1] * brightness);
		op[idx+2] = pixelClamp(ip[idx+2] * brightness);
	}
}

// adjust contrast (0 = gray, 1 = original)
function adjustContrast(input, output, contrast) {
	let ip = input.pixels;
	let op = output.pixels;
	for (let i = 0; i < input.width * input.height; i++) {
		let idx = i * 4;
		op[idx+0] = pixelClamp(contrast * ip[idx+0] + (1 - contrast) * 127);
		op[idx+1] = pixelClamp(contrast * ip[idx+1] + (1 - contrast) * 127);
		op[idx+2] = pixelClamp(contrast * ip[idx+2] + (1 - contrast) * 127);
	}
}

// adjust saturation (0 = grayscale, 1 = original)
function adjustSaturation(input, out, saturation) {
	let ip = input.pixels;
	let op = out.pixels;
	for (let i = 0; i < input.width * input.height; i++) {
		let idx = i * 4;
		let L = 0.3 * ip[idx+0] + 0.59 * ip[idx+1] + 0.11 * ip[idx+2];
		op[idx+0] = pixelClamp(saturation * ip[idx+0] + (1 - saturation) * L);
		op[idx+1] = pixelClamp(saturation * ip[idx+1] + (1 - saturation) * L);
		op[idx+2] = pixelClamp(saturation * ip[idx+2] + (1 - saturation) * L);
	}
}

// box blur
function boxBlur(input, output, ksize) {
	let boxkernel = Array(ksize).fill().map(() => Array(ksize).fill(1.0/ksize/ksize));
	filterImage(input, output, boxkernel);
}

// Gaussian blur
function gaussianBlur(input, output, sigma) {
	let gkernel = gaussianKernel(sigma);
	filterImage(input, output, gkernel);
}

// edge detection
function edgeDetect(input, output) {
	let ekernel = [[0, -2, 0], [-2, 8, -2], [0, -2, 0]];
	filterImage(input, output, ekernel);
}

// sharpen (with 3x3 kernel)
function sharpen(input, output, sharpness) {
	let s = sharpness;
	let shkernel = [[0, -1*s, 0], [-1*s, 1+4*s, -1*s], [0, -1*s, 0]];
	filterImage(input, output, shkernel);
}

// uniform dithering (quantization)
function uniformQuantization(input, output) {
	let ip = input.pixels;
	let op = output.pixels;
	for (let i = 0; i < input.width * input.height; i++) {
		let idx = i * 4;
		let L = 0.3 * ip[idx+0] + 0.59 * ip[idx+1] + 0.11 * ip[idx+2];
		let bw = L > 127 ? 255 : 0;
		op[idx+0] = bw;
		op[idx+1] = bw;
		op[idx+2] = bw;
	}
}

// random dithering
function randomDither(input, output) {
	let ip = input.pixels;
	let op = output.pixels;
	for (let i = 0; i < input.width * input.height; i++) {
		let idx = i * 4;
		let L = 0.3 * ip[idx+0] + 0.59 * ip[idx+1] + 0.11 * ip[idx+2];
		let e = Math.random() * 255;
		let bw = L > e ? 255 : 0;
		op[idx+0] = bw;
		op[idx+1] = bw;
		op[idx+2] = bw;
	}
}

// ordered dithering
function orderedDither(input, output) {
	let bayers =
		[[15/16.0,  7/16.0,  13/16.0,   5/16.0],
		 [3/16.0,  11/16.0,   1/16.0,   9/16.0],
		 [12/16.0,  4/16.0,  14/16.0,   6/16.0],
		 [ 0,      8/16.0,    2/16.0,  10/16.0]];
	let ip = input.pixels;
	let op = output.pixels;
	for (let y = 0; y < input.height; y++) {
		for (let x = 0; x < input.width; x++) {
			let e = bayers[x % 2][y % 2] * 255;
			let idx = (y * input.width + x) * 4;
			let L = 0.3 * ip[idx+0] + 0.59 * ip[idx+1] + 0.11 * ip[idx+2];
			let bw = L > e ? 255 : 0;
			op[idx+0] = bw;
			op[idx+1] = bw;
			op[idx+2] = bw;
		}
	}
}

// image mosaic using mosaic dataset
function imageMosaic(input, output, mosaic_name) {
	document.body.style.cursor = "progress";

  let width = input.width;
	let height = input.height;

	let mimages = mosaics[mosaic_name];
	let w = mimages[0].width;
	let h = mimages[0].height;
	let num = mimages.length;

	let ip = input.pixels;
	let op = output.pixels;

	let denom_r = denom_g = denom_b = new Array(num).fill(0);
	for (let k = 0; k < num; k++) {
		for (let j = 0; j < h; j++) {
			let mp = mimages[k].pixels;
			for (let i = 0; i < w; i++) {
				let m_idx = (j * w + i) * 4;
				denom_r[k] += (mp[m_idx+0]*mp[m_idx+0]);
				denom_g[k] += (mp[m_idx+1]*mp[m_idx+1]);
				denom_b[k] += (mp[m_idx+2]*mp[m_idx+2]);
			}
		}
	}

	let y = 0;
  (function chunk() {
		for (x = 0; x <= width - w; x += w) {
			let k_min = 0;
			let d_min = 0;
			let a_r_min = a_g_min = a_b_min = 0;
			// loop over candidates
			for (let k = 0; k < num; k++) {
				let d_r = d_g = d_b = 0;
				let a_r = a_g = a_b = 0;
				let num_r = num_g = num_b = 0;
				let denom_r = denom_g = denom_b = 0;
				let mp = mimages[k].pixels;
				// loop over pixels in block
				for (let j = 0; j < h; j++) {
					for (let i = 0; i < w; i++) {
						let idx = ((y + j) * input.width + (x + i)) * 4;
						let m_idx = (j * w + i) * 4;
						num_r += (ip[idx+0] * mp[m_idx+0]);
						num_g += (ip[idx+1] * mp[m_idx+1]);
						num_b += (ip[idx+2] * mp[m_idx+2]);
						denom_r += (mp[m_idx+0] * mp[m_idx+0]);
						denom_g += (mp[m_idx+1] * mp[m_idx+1]);
						denom_b += (mp[m_idx+2] * mp[m_idx+2]);
					}
				}
				a_r = num_r / denom_r;
				a_g = num_g / denom_g;
				a_b = num_b / denom_b;
				d_r = (-1 * num_r * num_r) / denom_r;
				d_g = (-1 * num_g * num_g) / denom_g;
				d_b = (-1 * num_b * num_b) / denom_b;
				// random noise
				let d = d_r + d_g + d_b;
				d *= ((Math.random() * 2) + 1);
				if (k == 0) {
					d_min = d;
				}
				if (d < d_min) {
					d_min = d;
					k_min = k;
					a_r_min = a_r;
					a_g_min = a_g;
					a_b_min = a_b;
				}
			}
			// copy the best match to output image block
			for (let j = 0; j < h; j++) {
				for (let i = 0; i < w; i++) {
					let idx = ((y + j) * input.width + (x + i)) * 4;
					let m_idx = (j * w + i) * 4;
					let mp = mimages[k_min].pixels;
					op[idx+0] = mp[m_idx+0] * a_r_min;
					op[idx+1] = mp[m_idx+1] * a_g_min;
					op[idx+2] = mp[m_idx+2] * a_b_min;
				}
			}
		}
		output.updatePixels();
		y += h;
    if (y <= height - h) {
    	setTimeout(chunk, 0);
    } else {
      document.body.style.cursor = "default";
    }
  })();
}

// load mosaic datasets
function loadMosaicImages() {
	for (let mosaic_id = 0; mosaic_id < mosaic_names.length; mosaic_id++) {
		let montage = mosaic_montages[mosaic_id];
		let mosaic_name = mosaic_names[mosaic_id];
		mosaics[mosaic_name] = [];

		let w = mosaic_img_size[mosaic_id][0];
		let h = mosaic_img_size[mosaic_id][1];
		let nimgs = mosaic_nimages[mosaic_id];

		let i = 1;
		for (let y = 0; y < montage.height; y += h) {
			for (let x = 0; x < montage.width; x += w, i++) {
				let new_image = createImage(w, h);
				new_image.copy(montage, x, y, w, h, 0, 0, w, h);
				new_image.loadPixels();
				mosaics[mosaic_name].push(new_image);
				if (i >= nimgs) break;
			}
			if (i >= nimgs) break;
		}
	}
}

// load input images
function loadInputImages() {
	for (let i = 0; i < input_image_names.length; i++) {
		input_images[input_image_names[i]] = loadImage(input_image_urls[i]);
	}
}

// apply brightness, contrast, saturation
function applyPixelOperations() {
	brighten(input, output, params.brightness);
	adjustContrast(output, output, params.contrast);
	adjustSaturation(output, output, params.saturation);
	output.updatePixels();
}

// clamp pixels between 0 and 255
function pixelClamp(value) {
	return(value < 0 ? 0 : (value > 255 ? 255 : (value >> 0)));
}

// preload images
function preload() {
  for (let mosaic_id = 0; mosaic_id < mosaic_names.length; mosaic_id++) {
		mosaic_montages[mosaic_id] = loadImage(mosaic_urls[mosaic_id]);
	}
	loadInputImages();
}

function loadSelectedInput() {
	input = input_images[params.Image];
	input.loadPixels();
	output = createImage(input.width, input.height);
	output.copy(input, 0, 0, input.width, input.height, 0, 0, input.width, input.height);
	output.loadPixels();
	params.Reset(true);
}

let ParameterControl = function() {
	this.Image = 'Mona Lisa';
	this.brightness = 1.0;
	this.contrast = 1.0;
	this.saturation = 1.0;
	this.boxsize = 2;
	this.sigma = 1;
	this.sharpness = 0.3;
	this.Reset = function(partial) {
		this.brightness = 1.0;
		this.contrast = 1.0;
		this.saturation = 1.0;
		if (partial == 'undefined' || partial == false) {
			this.boxsize = 2;
			this.sigma = 1;
			this.sharpness = 0.3;
		}
		output.copy(input, 0, 0, input.width, input.height, 0, 0, input.width, input.height);
		output.loadPixels();
	}
	this['Apply Box Blur'] = function() { boxBlur(input, output, this.boxsize * 2 + 1); };
	this['Apply Gaussian Blur'] = function() { gaussianBlur(input, output, this.sigma); };
	this['Apply Sharpen'] = function() { sharpen(input, output, this.sharpness); };
	this['Edge Detect'] = function() { edgeDetect(input, output); output.updatePixels(); };
	this.uniform = function() { uniformQuantization(input, output);	output.updatePixels(); };
	this.random = function() { randomDither(input, output); 	output.updatePixels(); };
	this.ordered = function() { orderedDither(input, output); output.updatePixels(); };
	this['Mosaic Dataset'] = 'Albums';
	this['Apply Mosaic'] = function() { imageMosaic(input, output, this['Mosaic Dataset']); };
}

let params = new ParameterControl();

// p5 setup
function setup() {

	loadMosaicImages();
	canvas = createCanvas(window.innerWidth, window.innerHeight);

	let gui = new dat.GUI();
	let ctrl = gui.add(params, 'Image', input_image_names);
	ctrl.onFinishChange(function(value) { loadSelectedInput(); });

	let panel1 = gui.addFolder('Pixel Operations');
	ctrl = panel1.add(params, 'brightness', 0, 4.0).step(0.05).listen();
	ctrl.onFinishChange(function(value) { applyPixelOperations(); });

	ctrl = panel1.add(params, 'contrast', 0, 4.0).step(0.05).listen();
	ctrl.onFinishChange(function(value) { applyPixelOperations(); });

	ctrl = panel1.add(params, 'saturation', 0, 4.0).step(0.05).listen();
	ctrl.onFinishChange(function(value) { applyPixelOperations(); });

	panel1.add(params, 'Reset');
	panel1.open();

	let panel2 = gui.addFolder('Image Convolution');
  panel2.add(params, 'sharpness', 0, 1.0).step(0.05).listen();
	panel2.add(params, 'Apply Sharpen');
	panel2.add(params, 'Edge Detect');
	panel2.open();

  let panel5 = gui.addFolder('Image Mosaic');
	panel5.add(params, 'Mosaic Dataset', mosaic_names);
	panel5.add(params, 'Apply Mosaic');
	panel5.open();

  let panel3 = gui.addFolder('Blurring');
  panel3.add(params, 'boxsize', 1, 7).step(1).listen();
	panel3.add(params, 'Apply Box Blur');
	panel3.add(params, 'sigma', 0.1, 4.0).step(0.1).listen();
	panel3.add(params, 'Apply Gaussian Blur');

	let panel4 = gui.addFolder('Dithering');
	panel4.add(params, 'uniform');
	panel4.add(params, 'random');
	panel4.add(params, 'ordered');

	loadSelectedInput();
}

// p5 loop
function draw() {
	clear();
	image(output, 0, 0);
  noFill();
  stroke('#333');
  strokeWeight(1.5);
  rect(0, 0, output.width, output.height);
}

// compute gaussian kernel
function gaussianKernel(std) {
	let sigma = std;
	let ksize = Math.floor(6.0 * std) % 2 ? Math.floor(6.0 * std) : Math.floor(6.0 * std) + 1;
	if (ksize < 1) {
    ksize = 1;
  }
	let r = 0.0;
	let s = 2.0 * sigma * sigma;
	let sum = 0.0;
	let gkernel = Array(ksize).fill().map(() => Array(ksize));
	let offset = Math.floor(ksize / 2);

	if (ksize == 1)	{
    gkernel[0][0] = 1;
    return gkernel;
  }

	for (let x = -offset; x <= offset; x++) {
		for (let y = -offset; y <= offset; y++){
			r = Math.sqrt(x * x + y * y);
			gkernel[x + offset][y + offset] = (Math.exp(-(r*r) / s)) / Math.PI * s;
			sum += gkernel[x + offset][y + offset];
		}
	}
	// normalize coefficients
	for (let x = 0; x < ksize; x++){
		for (let y = 0; y < ksize; y++){
			gkernel[x][y] /= sum;
		}
	}
	return gkernel;
}

function filterImage(input, output, kernel, ) {
	input.loadPixels();
	output.loadPixels();
	let ip = input.pixels;
	let op = output.pixels;
	let index = 0;
	for (let y = 0; y < input.height; y++) {
		for (let x = 0; x < input.width; x++, index += 4) {
			op.set(applyKernel(input, x, y, kernel), index);
		}
	}
	output.updatePixels();
}

function applyKernel(image, x, y, kernel) {
	let ksize = kernel.length;
	let rtotal = 0, gtotal = 0, btotal = 0;
	let xloc = 0, yloc = 0, idx = 0, coeff = 0;
	let offset = (ksize / 2) >> 0;
	let p = image.pixels;

	for (let i = 0; i < ksize; i++) {
		for (let j = 0; j < ksize; j++) {
			xloc = x + i - offset;
			xloc = (xloc < 0) ? 0 : ((xloc > image.width - 1) ? image.width - 1 : xloc);
			yloc = y + j - offset;
			yloc = (yloc < 0) ? 0 : ((yloc > image.height - 1) ? image.height - 1 : yloc);

			idx = (yloc * image.width + xloc) * 4;
			coff = kernel[i][j];
			rtotal += p[idx+0] * coff;
			gtotal += p[idx+1] * coff;
			btotal += p[idx+2] * coff;
		}
	}
  return [pixelClamp(rtotal), pixelClamp(gtotal), pixelClamp(btotal)];
}
