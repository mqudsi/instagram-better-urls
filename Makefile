NAME = instagram-better-urls
ZIP = $(NAME).zip

# Files to bundle into the extension zip
SOURCES = \
	manifest.json \
	content.js \
	icon-16.png \
	icon-32.png \
	icon-48.png \
	icon-128.png \
	icon.svg

.PHONY: all clean

all: $(ZIP)

# Rebuild zip only if any source file is newer than the zip
$(ZIP): $(SOURCES)
	rm -f $(ZIP)
	zip -r $(ZIP) $(SOURCES)

clean:
	rm -f $(ZIP)