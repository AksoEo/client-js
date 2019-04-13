import crypto from 'crypto';
import { promisify } from 'util';
import { base32 } from 'rfc4648';
import QRCode from 'qrcode';

export async function generateTotp (ueaCode) {
	const secret = await promisify(crypto.randomBytes)(20);
	const secretBase32 = base32.stringify(secret);
	const issuer = encodeURIComponent('TEJO/UEA');
	const otpURL = `otpauth://totp/${issuer}:${ueaCode}?secret=${secretBase32}&issuer=${issuer}&digits=6&period=30`;
	const qrCode = await QRCode.toDataURL(otpURL);

	return {
		secret: secret,
		otpURL: otpURL,
		qrCode: qrCode
	};
}
