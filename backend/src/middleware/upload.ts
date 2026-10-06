import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';
import { env } from '../lib/env';

const uploadRoot = path.resolve(process.cwd(), env.uploadDir);
if (!fs.existsSync(uploadRoot)) fs.mkdirSync(uploadRoot, { recursive: true });

const ALLOWED_MIME_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    // Never derive the on-disk name from user input (path traversal, control
    // characters, overlong names): generate a random name and pick the
    // extension from the verified MIME type, not the client-supplied filename.
    const ext = ALLOWED_MIME_EXT[file.mimetype] || '';
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_EXT[file.mimetype]) return cb(new Error('Unsupported file type.'));
    cb(null, true);
  },
});

export function fileToRef(file: Express.Multer.File, uploadedBy: string) {
  return {
    url: `${env.publicUploadPath}/${file.filename}`,
    name: sanitizeDisplayName(file.originalname),
    mimeType: file.mimetype,
    uploadedBy,
    uploadedAt: new Date().toISOString(),
  };
}

// The original filename is only ever used for display/download-as-name, never
// to address a file on disk, but still strip path separators and control
// characters before it's echoed back into HTML/attribute contexts.
function sanitizeDisplayName(name: string): string {
  // eslint-disable-next-line no-control-regex -- intentionally stripping control characters
  return name.replace(/[\\/]/g, '_').replace(/[\u0000-\u001f]/g, '').slice(0, 180);
}

export function deleteUploadedFile(url: string | null | undefined) {
  if (!url) return;
  const filename = path.basename(url);
  if (!filename || filename.includes('..')) return;
  const filePath = path.join(uploadRoot, filename);
  // Only ever delete a path that resolves inside the upload root.
  if (!filePath.startsWith(uploadRoot)) return;
  fs.promises.unlink(filePath).catch(() => undefined);
}
