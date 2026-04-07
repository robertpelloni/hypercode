package hsync

import (
	"context"
	"fmt"
	"time"

	"github.com/chromedp/cdproto/dom"
	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"
)

type BrowserPageData struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Content string `json:"content"`
}

type BrowserStatus struct {
	Available bool     `json:"available"`
	Active    bool     `json:"active"`
	PageCount int      `json:"pageCount"`
	PageIDs   []string `json:"pageIds"`
}

// ScrapePage opens a headless browser, navigates to the URL, and extracts text content.
func ScrapePage(ctx context.Context, url string) (*BrowserPageData, error) {
	// Create context with timeout
	scrapeCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.DisableGPU,
		chromedp.NoSandbox,
		chromedp.Headless,
	)
	allocCtx, allocCancel := chromedp.NewExecAllocator(scrapeCtx, opts...)
	defer allocCancel()

	taskCtx, taskCancel := chromedp.NewContext(allocCtx)
	defer taskCancel()

	var title string
	var html string

	err := chromedp.Run(taskCtx,
		chromedp.Navigate(url),
		chromedp.Title(&title),
		chromedp.ActionFunc(func(ctx context.Context) error {
			node, err := dom.GetDocument().Do(ctx)
			if err != nil {
				return err
			}
			res, err := dom.GetOuterHTML().WithNodeID(node.NodeID).Do(ctx)
			if err != nil {
				return err
			}
			html = res
			return nil
		}),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to scrape page: %w", err)
	}

	return &BrowserPageData{
		ID:      fmt.Sprintf("page-%d", time.Now().UnixMilli()),
		Title:   title,
		Content: extractVisibleText(html),
	}, nil
}

// ScreenshotPage opens a headless browser, navigates to the URL, and returns a base64 PNG screenshot.
func ScreenshotPage(ctx context.Context, url string) ([]byte, error) {
	scrapeCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.DisableGPU,
		chromedp.NoSandbox,
		chromedp.Headless,
	)
	allocCtx, allocCancel := chromedp.NewExecAllocator(scrapeCtx, opts...)
	defer allocCancel()

	taskCtx, taskCancel := chromedp.NewContext(allocCtx)
	defer taskCancel()

	var buf []byte
	err := chromedp.Run(taskCtx,
		chromedp.Navigate(url),
		chromedp.ActionFunc(func(ctx context.Context) error {
			// Wait for layout to stabilize
			time.Sleep(2 * time.Second)
			var err error
			buf, err = page.CaptureScreenshot().WithFormat(page.CaptureScreenshotFormatPng).Do(ctx)
			return err
		}),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to capture screenshot: %w", err)
	}

	return buf, nil
}
