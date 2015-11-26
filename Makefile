JS_FILES := $(wildcard *.js) $(wildcard thirdParty/*.js)
STYLES := $(wildcard *.css)
ICONS := $(wildcard share/icon*.png)
TARGETS := $(JS_FILES) $(STYLES) $(ICONS) manifest.json LICENSE

ZIP_NAME := youtube_score.zip

.PHONY: all clean

all: $(ZIP_NAME)

$(ZIP_NAME): $(TARGETS)
	zip $(ZIP_NAME) $(TARGETS)

clean:
	rm $(ZIP_NAME)
