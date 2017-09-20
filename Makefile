JS_FILES := background.js observer.js vendor/jquery/dist/jquery.min.js
STYLES := $(wildcard *.css)
ICONS := $(wildcard share/icon*.png)
TARGETS := $(JS_FILES) $(STYLES) $(ICONS) manifest.json LICENSE

ZIP_NAME := youtube_score.zip

.PHONY: all

all: $(ZIP_NAME)

$(ZIP_NAME): $(TARGETS)
	zip -FS $(ZIP_NAME) $(TARGETS)

clean:
	rm $(ZIP_NAME)
