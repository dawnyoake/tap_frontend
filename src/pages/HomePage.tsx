import { getRouteApi, Link } from "@tanstack/react-router";
import { ArrowRight, LayoutGrid } from "lucide-react";
import "./HomePage.css";

const homeRoute = getRouteApi("/");

export function HomePage() {
  const { art } = homeRoute.useSearch();
  const showArt = art === 1;

  return (
    <section className={showArt ? "home-scene home-scene--art" : "home-scene"} aria-labelledby="home-title">
      {showArt && (
        <>
          <img
            className="home-scene-art"
            src="/home/tee-test-chamber.webp"
            alt=""
            width={1672}
            height={941}
            fetchPriority="high"
          />
          <div className="home-scene-light" aria-hidden="true" />
          <div className="home-scene-sparks" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
        </>
      )}
      <div className="home-scene-content">
        <h1 id="home-title">TEE Pipeline</h1>
        <div className="home-actions">
          <Link to="/submit" className={showArt ? "home-launch" : "button primary cta"}>
            发布任务
            <ArrowRight className="cta-arrow" size={18} aria-hidden="true" />
          </Link>
          <Link to="/tasks" search={{ mine: true }} className="button">
            <LayoutGrid size={16} aria-hidden="true" /> 查看我的任务
          </Link>
        </div>
      </div>
    </section>
  );
}
