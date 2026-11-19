/**
 * NewLeap Biotech: carga una etiqueta ya dibujada desde la URL.
 *
 *   ...#id=<ID>&img=<data:image/png;base64,... codificado con encodeURIComponent>
 *
 * Los datos van detrás de "#": el navegador no los envía al servidor.
 * La imagen sustituye al diseño guardado y ocupa toda la etiqueta (umbral al 50 %, sin tramado).
 * Si la impresora detecta otro rollo, la imagen se vuelve a ajustar y se gira si hace falta.
 * No conecta ni imprime: eso lo hace siempre el usuario.
 */
import { untrack } from 'svelte';
import { editor } from '../stores/editor.svelte';
import { mode } from '../stores/mode.svelte';
import { loadCatalog } from '../catalog';
import type { ImageElement } from '../design/model';
import type { LabelSpec } from '../printer/types';

const PREFIJO = 'data:image/png;base64,';
const ID_ELEMENTO = 'newleap-etiqueta';
/** T53044: rollo de 66 x 25 mm del catálogo T50/T80. */
const ID_ROLLO_66X25 = '5377';

/** PNG original recibido por la URL (sin girar). */
let original: string | null = null;
let version = 0;

function leerHash(): { id: string; img: string } | null {
	if (typeof window === 'undefined' || !location.hash.includes('img=')) return null;
	const p = new URLSearchParams(location.hash.slice(1));
	const img = p.get('img') ?? '';
	if (!img.startsWith(PREFIJO) || !/^[A-Za-z0-9+/]+={0,2}$/.test(img.slice(PREFIJO.length))) return null;
	return { id: (p.get('id') ?? '').slice(0, 60), img };
}

function cargarImagen(src: string): Promise<HTMLImageElement> {
	return new Promise((ok, ko) => {
		const i = new Image();
		i.onload = () => ok(i);
		i.onerror = ko;
		i.src = src;
	});
}

/** Gira la imagen 90° si su orientación no coincide con la de la etiqueta. */
async function orientar(src: string, labelW: number, labelH: number): Promise<string> {
	const img = await cargarImagen(src);
	if (img.naturalWidth >= img.naturalHeight === labelW >= labelH) return src;
	const c = document.createElement('canvas');
	c.width = img.naturalHeight;
	c.height = img.naturalWidth;
	const g = c.getContext('2d');
	if (!g) return src;
	g.translate(c.width, 0);
	g.rotate(Math.PI / 2);
	g.drawImage(img, 0, 0);
	return c.toDataURL('image/png');
}

function elementoEtiqueta(src: string, w: number, h: number): ImageElement {
	return { id: ID_ELEMENTO, type: 'image', x: 0, y: 0, w, h, rotation: 0, src, threshold: 128, dither: false };
}

function aviso(texto: string) {
	const mostrar = () => {
		document.getElementById('newleap-aviso')?.remove();
		const d = document.createElement('div');
		d.id = 'newleap-aviso';
		d.setAttribute('role', 'status');
		d.style.cssText =
			'position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:9999;max-width:92vw;' +
			'padding:10px 42px 10px 16px;border-radius:10px;background:#862065;color:#fff;' +
			'font:600 15px/1.35 Inter,Arial,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25)';
		d.textContent = texto;
		const x = document.createElement('button');
		x.textContent = '×';
		x.setAttribute('aria-label', 'Cerrar');
		x.style.cssText = 'position:absolute;top:4px;right:10px;border:0;background:none;color:#fff;font-size:22px;cursor:pointer';
		x.onclick = () => d.remove();
		d.appendChild(x);
		document.body.appendChild(d);
	};
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrar, { once: true });
	else mostrar();
}

async function cargar() {
	const datos = leerHash();
	if (!datos) return;
	// Que la imagen no se quede en la barra de direcciones ni en el historial.
	history.replaceState(null, '', location.pathname + location.search);
	if (mode.choosing || mode.mode !== 'studio') mode.choose('studio');

	let rollo: LabelSpec | undefined;
	try {
		rollo = (await loadCatalog('t5080')).find((l) => l.id === ID_ROLLO_66X25);
	} catch {
		// Sin catálogo: se queda la etiqueta actual.
	}
	const etq = rollo ?? editor.label;
	let src: string;
	try {
		src = await orientar(datos.img, etq.lengthMm, etq.widthMm);
	} catch {
		return; // La imagen no se puede leer: página normal.
	}

	original = datos.img;
	editor.checkpoint();
	editor.elements = [];
	editor.selectedId = null;
	if (rollo) editor.setLabel(rollo, true);
	editor.elements = [elementoEtiqueta(src, etq.lengthMm, etq.widthMm)];
	editor.persist();
	aviso(`Etiqueta ${datos.id || ''} cargada. Conecta la impresora y pulsa Imprimir.`.replace('  ', ' '));
}

/** Vuelve a ajustar la etiqueta a toda la superficie cuando cambia el rollo. */
async function reajustar(w: number, h: number) {
	if (!original) return;
	const el = editor.elements.find((e) => e.id === ID_ELEMENTO);
	if (!el || (el.x === 0 && el.y === 0 && el.w === w && el.h === h)) return;
	const v = ++version;
	let src: string;
	try {
		src = await orientar(original, w, h);
	} catch {
		return;
	}
	if (v !== version) return;
	const cambios: Partial<ImageElement> = { x: 0, y: 0, w, h, rotation: 0, src };
	editor.update(ID_ELEMENTO, cambios, false);
}

if (typeof window !== 'undefined') {
	$effect.root(() => {
		$effect(() => {
			const w = editor.label.lengthMm;
			const h = editor.label.widthMm;
			untrack(() => void reajustar(w, h));
		});
	});
	window.addEventListener('hashchange', () => void cargar());
	void cargar();
}
