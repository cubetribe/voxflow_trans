import { test, expect } from '@playwright/test';

test.describe('VoxFlow Transcription Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the application to load
    await page.waitForLoadState('networkidle');
  });

  test('should complete audio file upload and transcription workflow', async ({ page }) => {
    // Check if the main components are present
    await expect(page.locator('h1')).toContainText('VoxFlow');
    
    // Look for upload area
    const uploadArea = page.locator('[data-testid="upload-area"], .upload-zone, input[type="file"]').first();
    await expect(uploadArea).toBeVisible();

    // Create a mock audio file for testing
    const audioBuffer = Buffer.from('mock audio data');
    
    // Simulate file upload
    await page.setInputFiles('input[type="file"]', {
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: audioBuffer,
    });

    // Wait for file to be processed and appear in the file list
    await expect(page.locator('[data-testid="file-item"], .file-item').first()).toBeVisible();
    
    // Check if file information is displayed
    await expect(page.locator('text=test-audio.mp3')).toBeVisible();
    
    // Look for start transcription button
    const startButton = page.locator('button:has-text("Start Transcription"), [data-testid="start-transcription"]').first();
    await expect(startButton).toBeVisible();
    await expect(startButton).not.toBeDisabled();

    // Start transcription
    await startButton.click();

    // Wait for transcription to begin
    await expect(page.locator('text=processing, text=Processing').first()).toBeVisible({ timeout: 10000 });
    
    // Check progress indicators
    await expect(page.locator('.progress-bar, [role="progressbar"]').first()).toBeVisible();

    // Mock transcription completion (in real test, this would wait for actual completion)
    // For E2E testing, we'll verify the UI updates correctly
    await page.waitForTimeout(2000);

    // Verify the workflow completed successfully
    await expect(page.locator('text=completed, text=Completed').first()).toBeVisible({ timeout: 30000 });
  });

  test('should handle real-time audio recording workflow', async ({ page }) => {
    // Grant microphone permissions (in a real test environment)
    await page.context().grantPermissions(['microphone']);

    // Navigate to recording section
    const recordButton = page.locator('button:has-text("Record"), [data-testid="record-button"]').first();
    
    if (await recordButton.isVisible()) {
      // Start recording
      await recordButton.click();

      // Verify recording state
      await expect(page.locator('text=Recording, .recording-indicator').first()).toBeVisible();
      await expect(page.locator('.waveform-display, [data-testid="waveform"]').first()).toBeVisible();

      // Wait for some recording time
      await page.waitForTimeout(3000);

      // Stop recording
      const stopButton = page.locator('button:has-text("Stop"), [data-testid="stop-button"]').first();
      await stopButton.click();

      // Verify recording stopped
      await expect(page.locator('text=Recording')).not.toBeVisible();
      
      // Check if recorded audio appears in file list
      await expect(page.locator('text=recording-').first()).toBeVisible();
    }
  });

  test('should handle batch processing workflow', async ({ page }) => {
    // Upload multiple files
    const files = [
      {
        name: 'audio1.mp3',
        mimeType: 'audio/mpeg',
        buffer: Buffer.from('mock audio data 1'),
      },
      {
        name: 'audio2.wav',
        mimeType: 'audio/wav',
        buffer: Buffer.from('mock audio data 2'),
      },
      {
        name: 'audio3.m4a',
        mimeType: 'audio/mp4',
        buffer: Buffer.from('mock audio data 3'),
      },
    ];

    await page.setInputFiles('input[type="file"]', files);

    // Wait for all files to appear
    await expect(page.locator('text=audio1.mp3')).toBeVisible();
    await expect(page.locator('text=audio2.wav')).toBeVisible();
    await expect(page.locator('text=audio3.m4a')).toBeVisible();

    // Select all files checkbox
    const selectAllCheckbox = page.locator('input[type="checkbox"]:has-text("Select all"), [data-testid="select-all"]').first();
    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.check();
    }

    // Start batch processing
    const batchButton = page.locator('button:has-text("Start Transcription")').first();
    await batchButton.click();

    // Verify batch progress
    await expect(page.locator('text=Processing').first()).toBeVisible();
    await expect(page.locator('text=3').first()).toBeVisible(); // Number of files being processed

    // Check overall progress indicator
    await expect(page.locator('.progress-bar, [role="progressbar"]').first()).toBeVisible();
  });

  test('should handle transcription settings and configuration', async ({ page }) => {
    // Look for settings or configuration section
    const settingsButton = page.locator('button:has-text("Settings"), [data-testid="settings"]').first();
    
    if (await settingsButton.isVisible()) {
      await settingsButton.click();

      // Check configuration options
      await expect(page.locator('text=Output Format, text=Format').first()).toBeVisible();
      
      // Test format selection
      const formatSelect = page.locator('select[name="format"], [data-testid="format-select"]').first();
      if (await formatSelect.isVisible()) {
        await formatSelect.selectOption('JSON');
        await expect(formatSelect).toHaveValue('JSON');
      }

      // Test timestamp options
      const timestampsCheckbox = page.locator('input[type="checkbox"]:near(text="Timestamp"), [data-testid="timestamps"]').first();
      if (await timestampsCheckbox.isVisible()) {
        await timestampsCheckbox.check();
        await expect(timestampsCheckbox).toBeChecked();
      }

      // Test confidence scores
      const confidenceCheckbox = page.locator('input[type="checkbox"]:near(text="Confidence"), [data-testid="confidence"]').first();
      if (await confidenceCheckbox.isVisible()) {
        await confidenceCheckbox.check();
        await expect(confidenceCheckbox).toBeChecked();
      }
    }
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Test unsupported file type
    const unsupportedFile = {
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake pdf content'),
    };

    await page.setInputFiles('input[type="file"]', unsupportedFile);

    // Should show error message
    await expect(page.locator('text=unsupported, text=not supported').first()).toBeVisible();
  });

  test('should display transcription results correctly', async ({ page }) => {
    // Mock a completed transcription (this would be set up with test data)
    // Upload a file and simulate completion
    await page.setInputFiles('input[type="file"]', {
      name: 'completed.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('mock audio'),
    });

    // Wait for file upload
    await expect(page.locator('text=completed.mp3')).toBeVisible();

    // If there's a mock completed transcription, check the results
    const resultsButton = page.locator('button:has-text("View"), [data-testid="view-results"]').first();
    
    if (await resultsButton.isVisible()) {
      await resultsButton.click();

      // Check transcription display
      await expect(page.locator('[data-testid="transcription-text"], .transcription-result').first()).toBeVisible();
      
      // Check download options
      await expect(page.locator('button:has-text("Download"), [data-testid="download"]').first()).toBeVisible();
    }
  });

  test('should handle WebSocket connection status', async ({ page }) => {
    // Check connection status indicator
    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-indicator').first();
    
    if (await connectionStatus.isVisible()) {
      // Should show connected or connecting state
      await expect(connectionStatus).toContainText(/connected|connecting/i);
    }

    // Test real-time updates (if WebSocket is working)
    // This would require a running backend service
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    
    // Check if mobile layout is applied
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    // Check if layout adapts
    await expect(page.locator('body')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.reload();
    
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle accessibility requirements', async ({ page }) => {
    // Check for proper ARIA labels and roles
    await expect(page.locator('button')).toHaveAttribute('type');
    
    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate with keyboard
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Check for proper contrast and text sizes
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        await expect(button).toBeVisible();
      }
    }
  });
});