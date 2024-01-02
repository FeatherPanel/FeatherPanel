import { CONFIG } from "../constants";

export const welcomeEmailTemplate = (name: string, url: string, txt = false) => {
	let message = "";

	if (txt) {
		message += 	`Bienvenue ${name}\n\n`;
		message += 	`Cliquez sur le lien suivant pour confirmer votre inscription sur ${CONFIG.app.name}\n\n`;
		message += 	`${url}\n\n`;
		message += 	`Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\n`;
		message += 	`Ceci est un e-mail automatique, merci de ne pas y répondre.\n\n`;
		message += 	`© ${new Date().getFullYear()} ${CONFIG.app.name}. Tous droits réservés.`;
	} else {
		message += 	`<div style='padding:0;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background-color:#f3f4f6;min-width:100vw;background-color:rgb(241 245 249);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"'>`;
		message += 		`<div style="max-width:600px;padding:20px;text-align:center;color:#374151;background-color:#fff;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);border-radius:30px;padding:60px">`;
		message += 			`<h3 style="font-size:2rem;font-weight:600;margin-bottom:20px">`;
		message += 				`Bienvenue ${name}`;
		message += 			`</h3>`;

		message += 			`<div style="display:flex;justify-content:center">`;
		message += 				`<svg xmlns="http://www.w3.org/2000/svg" style="width:100px;height:100px;color:#570df8" fill="none" viewBox="0 0 24 24" stroke="currentColor">`;
		message += 					`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"/>`;
		message += 				`</svg>`;
		message += 			`</div>`;

		message += 			`<p style="font-size:1rem;font-weight:600;margin-top:20px">`;
		message += 				`Cliquez sur le bouton ci-dessous pour confirmer votre inscription sur ${CONFIG.app.name}`;
		message += 			`</p>`;

		message += 			`<div style="margin-top:20px">`;
		message += 				`<a style="height:3rem;padding-left:1rem;padding-right:1rem;display:inline-flex;align-items:center;justify-content:center;font-size:1rem;font-weight:600;border:none;outline:1px solid transparent;outline-color:#570df8;color:#570df8;border-radius:.375rem;background-color:#fff;box-shadow:0 1px 2px 0 rgba(0,0,0,.05);text-decoration:none;line-height:3rem;cursor:pointer" href="${url}">`;
		message += 					`VÉRIFIER L'ADRESSE E-MAIL`;
		message += 				`</a>`;

		message += 				`<p style="margin-top:20px;font-size:.875rem">`;
		message += 					`Ou copiez et collez l'URL suivante dans votre navigateur: `;
		message += 					`<a href="${url}" style="color:#3b82f6;text-decoration:underline">`;
		message += 						`${url}`;
		message += 					`</a>`;
		message += 				`</p>`;
		message += 			`</div>`;

		message += 			`<p style="margin-top:20px;font-size:.875rem">`;
		message += 				`Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.`;
		message += 			`</p>`;
		message += 		`</div>`;

		message += 		`<div style="margin-top:20px">`;
		message += 			`<p style="font-size:.875rem;color:#374151;text-align:center">`;
		message += 				`Ceci est un e-mail automatique, merci de ne pas y répondre.`;
		message += 			`</p>`;
		message += 			`<p style="font-size:.875rem;color:#374151;text-align:center">`;
		message += 				`© ${new Date().getFullYear()} <a style="color:inherit" href="${CONFIG.app.url}" target="_blank">${CONFIG.app.name}</a>. Tous droits réservés.`;
		message += 			`</p>`;
		message += 		`</div>`;
		message += 	`</div>`;
	}

	return message;
};

export const changeEmailTemplate = (name: string, url: string, txt = false) => {
	let message = "";

	if (txt) {
		message += 	`Vérification de l'adresse e-mail pour ${name}\n\n`;
		message += 	`Cliquez sur le lien suivant pour modifier l'adresse e-mail associée à votre compte ${CONFIG.app.name}\n\n`;
		message += 	`${url}\n\n`;
		message += 	`Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\n`;
		message += 	`Ceci est un e-mail automatique, merci de ne pas y répondre.\n\n`;
		message += 	`© ${new Date().getFullYear()} ${CONFIG.app.name}. Tous droits réservés.`;
	} else {
		message += 	`<div style='padding:0;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background-color:#f3f4f6;min-width:100vw;background-color:rgb(241 245 249);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"'>`;
		message += 		`<div style="max-width:600px;padding:20px;text-align:center;color:#374151;background-color:#fff;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);border-radius:30px;padding:60px">`;
		message += 			`<h3 style="font-size:2rem;font-weight:600;margin-bottom:20px">`;
		message += 				`Vérification de l'adresse e-mail pour ${name}`;
		message += 			`</h3>`;

		message += 			`<div style="display:flex;justify-content:center">`;
		message += 				`<svg xmlns="http://www.w3.org/2000/svg" style="width:100px;height:100px;color:#570df8" fill="none" viewBox="0 0 24 24" stroke="currentColor">`;
		message += 					`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"/>`;
		message += 				`</svg>`;
		message += 			`</div>`;

		message += 			`<p style="font-size:1rem;font-weight:600;margin-top:20px">`;
		message += 				`Cliquez sur le bouton ci-dessous pour modifier l'adresse e-mail associée à votre compte ${CONFIG.app.name}`;
		message += 			`</p>`;

		message += 			`<div style="margin-top:20px">`;
		message += 				`<a style="height:3rem;padding-left:1rem;padding-right:1rem;display:inline-flex;align-items:center;justify-content:center;font-size:1rem;font-weight:600;border:none;outline:1px solid transparent;outline-color:#570df8;color:#570df8;border-radius:.375rem;background-color:#fff;box-shadow:0 1px 2px 0 rgba(0,0,0,.05);text-decoration:none;line-height:3rem;cursor:pointer" href="${url}">`;
		message += 					`VÉRIFIER L'ADRESSE E-MAIL`;
		message += 				`</a>`;

		message += 				`<p style="margin-top:20px;font-size:.875rem">`;
		message += 					`Ou copiez et collez l'URL suivante dans votre navigateur: `;
		message += 					`<a href="${url}" style="color:#3b82f6;text-decoration:underline">`;
		message += 						`${url}`;
		message += 					`</a>`;
		message += 				`</p>`;
		message += 			`</div>`;

		message += 			`<p style="margin-top:20px;font-size:.875rem">`;
		message += 				`Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.`;
		message += 			`</p>`;
		message += 		`</div>`;

		message += 		`<div style="margin-top:20px">`;
		message += 			`<p style="font-size:.875rem;color:#374151;text-align:center">`;
		message += 				`Ceci est un e-mail automatique, merci de ne pas y répondre.`;
		message += 			`</p>`;
		message += 			`<p style="font-size:.875rem;color:#374151;text-align:center">`;
		message += 				`© ${new Date().getFullYear()} <a style="color:inherit" href="${CONFIG.app.url}" target="_blank">${CONFIG.app.name}</a>. Tous droits réservés.`;
		message += 			`</p>`;
		message += 		`</div>`;
		message += 	`</div>`;
	}

	return message;
};

export const resetPasswordEmailTemplate = (name: string, code: string, txt = false) => {
	let message = "";

	if (txt) {
		message += 	`Réinitialisation du mot de passe de votre compte ${CONFIG.app.name}\n\n`;
		message += 	`Bonjour ${name}, voici votre code de réinitialisation de mot de passe: ${code}\n\n`;
		message += 	`Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\n`;
		message += 	`Ceci est un e-mail automatique, merci de ne pas y répondre.\n\n`;
		message += 	`© ${new Date().getFullYear()} ${CONFIG.app.name}. Tous droits réservés.`;
	} else {
		message += 		`<div style='padding:0;margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background-color:#f3f4f6;min-width:100vw;background-color:rgb(241 245 249);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"'>`;
		message += 			`<div style="max-width:600px;padding:20px;text-align:center;color:#374151;background-color:#fff;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);border-radius:30px;padding:60px">`;
		message += 				`<h3 style="font-size:2rem;font-weight:600;margin-bottom:20px">`;
		message += 					`Réinitialisation du mot de passe de votre compte ${CONFIG.app.name}`;
		message += 				`</h3>`;

		message += 				`<div style="display:flex;justify-content:center">`;
		message += 					`<svg xmlns="http://www.w3.org/2000/svg" style="width:100px;height:100px;color:#570df8" fill="none" viewBox="0 0 24 24" stroke="currentColor">`;
		message += 						`<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"/>`;
		message += 					`</svg>`;
		message += 				`</div>`;

		message += 				`<p style="font-size:1rem;font-weight:600;margin-top:20px">`;
		message += 					`Bonjour ${name}, voici votre code de réinitialisation de mot de passe: <strong>${code}</strong>`;
		message += 				`</p>`;

		message += 				`<p style="margin-top:20px;font-size:.875rem">`;
		message += 					`Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.`;
		message += 				`</p>`;
		message += 			`</div>`;

		message += 			`<div style="margin-top:20px">`;
		message += 				`<p style="font-size:.875rem;color:#374151;text-align:center">`;
		message += 					`Ceci est un e-mail automatique, merci de ne pas y répondre.`;
		message += 				`</p>`;
		message += 				`<p style="font-size:.875rem;color:#374151;text-align:center">`;
		message += 					`© ${new Date().getFullYear()} <a style="color:inherit" href="${CONFIG.app.url}" target="_blank">${CONFIG.app.name}</a>. Tous droits réservés.`;
		message += 				`</p>`;
		message += 			`</div>`;
		message += 		`</div>`;
	}

	return message;
};
