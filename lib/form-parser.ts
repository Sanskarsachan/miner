import { IncomingForm, File as FormidableFile } from 'formidable';
import { NextApiRequest } from 'next';

export async function parseForm(req: NextApiRequest) {
  const form = new IncomingForm({
    uploadDir: '/tmp',
    keepExtensions: true,
    maxFileSize: 100 * 1024 * 1024, // 100MB
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      resolve({ fields, files });
    });
  });
}
