import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGithub, faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { faEnvelope} from "@fortawesome/free-solid-svg-icons"

export default function Footer() {
  return (
    <footer className="footer">
      <span>¿Hay algún problema o tenés alguna sugerencia?</span>
      <span>
							<a href="mailto:jonathan.vicesar@fiuni.edu.py"> <FontAwesomeIcon icon={faEnvelope} className="footer-icon icon-envelope"/></a>
        <a
          href="https://github.com/JonaVicesar/fiuni_correlativas"
          target="_blank"
          rel="noopener noreferrer"
        >
          <FontAwesomeIcon icon={faGithub} className="footer-icon icon-github" />
        </a>
        <a className="footer-icon icon-whatsapp" title="WhatsApp">
          <FontAwesomeIcon icon={faWhatsapp} />
        </a>
      </span>
    </footer>
  );
}
