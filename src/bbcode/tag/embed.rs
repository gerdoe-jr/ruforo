use super::Element;
use std::cell::RefMut;
use url::Url;

impl super::Tag {
    pub fn open_img_tag(_: RefMut<Element>) -> String {
        String::new()
    }

    pub fn fill_img_tag(mut el: RefMut<Element>, contents: String) -> String {
        // Our URL comes from inside the tag.
        match Url::parse(&contents) {
            Ok(url) => match url.scheme() {
                "http" | "https" => {
                    el.clear_contents();
                    return format!("<img src=\"{}\" />", url.as_str());
                }
                _ => {}
            },
            Err(_) => {}
        }

        el.set_broken();
        contents
    }

    pub fn open_url_tag(el: RefMut<Element>) -> String {
        if el.is_broken() {
            el.to_open_str()
        } else {
            String::new()
        }
    }

    pub fn fill_url_tag(mut el: RefMut<Element>, contents: String) -> String {
        print!("fill_url_tag");
        let mut url: Option<Url> = None;

        if let Some(arg) = el.get_argument() {
            url = url_arg(arg);
            // TODO: Check for unfurl="true/false"
        }

        if url.is_none() {
            match Url::parse(&contents) {
                Ok(curl) => url = Some(curl),
                Err(_) => {}
            }
        }

        match url {
            Some(url) => format!(
                "<a class=\"bbCode tagUrl\" ref=\"nofollow\" href=\"{}\">{}",
                url.as_str(),
                contents
            ),
            // If we have no content, we are broken.
            None => {
                el.set_broken();
                contents
            }
        }
    }
}

fn url_arg(input: &str) -> Option<Url> {
    let input = input.strip_prefix('=')?;

    match Url::parse(input) {
        Ok(url) => Some(url),
        Err(_) => None,
    }
}
