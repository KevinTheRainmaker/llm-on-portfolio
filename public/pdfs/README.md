# PDF Files Directory

This directory is for PDF files that will be processed by the vector database.

Add your PDF files here, and they will be automatically processed when you run:
```bash
node src/scripts/create-vector-db.js
```

## Supported PDF Types

- Research papers
- Articles
- Documentation
- Any text-based PDF content

## Notes

- Large PDF files may take longer to process
- PDF files are not uploaded to Git by default (.gitignore)
- Make sure the PDF files contain searchable text (not scanned images)
