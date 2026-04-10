package com.gameshelf.util;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

/**
 * Stateless utility for processing profile images.
 *
 * Pipeline:
 *   raw bytes → decode → center-crop to square → resize to 256×256 → encode as JPEG 85%
 *
 * WebP decoding is handled automatically by the TwelveMonkeys ImageIO plugin
 * registered on the classpath (imageio-webp dependency in pom.xml).
 */
public final class ImageProcessingUtil {

    public static final int TARGET_SIZE = 256;    // px — output dimensions
    public static final float JPEG_QUALITY = 0.85f; // 85% — good quality / size balance

    private ImageProcessingUtil() {}

    /**
     * Processes a raw image upload into a 256×256 JPEG.
     *
     * @param inputBytes raw bytes of the uploaded file (JPEG / PNG / WebP)
     * @return JPEG-encoded bytes of the processed image
     * @throws IOException              if the file cannot be written
     * @throws IllegalArgumentException if the image cannot be decoded
     */
    public static byte[] processProfileImage(byte[] inputBytes) throws IOException {
        // Decode — ImageIO + TwelveMonkeys plugin covers JPEG, PNG, WebP
        BufferedImage original = ImageIO.read(new ByteArrayInputStream(inputBytes));
        if (original == null) {
            throw new IllegalArgumentException("Unsupported image format or corrupt file");
        }

        BufferedImage cropped = centerCropToSquare(original);
        BufferedImage resized  = resizeTo(cropped, TARGET_SIZE);
        return encodeAsJpeg(resized, JPEG_QUALITY);
    }

    // ── Private helpers ─────────────────────────────────────────────────────────

    /**
     * Crops the image to a centered square using the shorter dimension.
     * No scaling happens here — only cropping.
     */
    private static BufferedImage centerCropToSquare(BufferedImage img) {
        int w    = img.getWidth();
        int h    = img.getHeight();
        int side = Math.min(w, h);
        int x    = (w - side) / 2;
        int y    = (h - side) / 2;
        return img.getSubimage(x, y, side, side);
    }

    /**
     * Scales the image to targetSize × targetSize.
     * Uses bilinear interpolation for smooth downscaling.
     * Converts to TYPE_INT_RGB so that JPEG encoding never encounters an alpha channel.
     * Transparent pixels (PNG) are composited over a white background.
     */
    private static BufferedImage resizeTo(BufferedImage img, int targetSize) {
        BufferedImage output = new BufferedImage(targetSize, targetSize, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = output.createGraphics();
        try {
            // White background handles transparent source images (e.g. PNG with alpha)
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, targetSize, targetSize);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                               RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING,
                               RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(img, 0, 0, targetSize, targetSize, null);
        } finally {
            g.dispose();
        }
        return output;
    }

    /**
     * Encodes a BufferedImage as JPEG bytes at the given quality (0.0–1.0).
     * Uses the explicit compression param so the quality is always enforced.
     */
    private static byte[] encodeAsJpeg(BufferedImage img, float quality) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpeg").next();
        ImageWriteParam param = writer.getDefaultWriteParam();
        param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
        param.setCompressionQuality(quality);

        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
            writer.setOutput(ios);
            writer.write(null, new IIOImage(img, null, null), param);
        } finally {
            writer.dispose();
        }
        return baos.toByteArray();
    }
}
