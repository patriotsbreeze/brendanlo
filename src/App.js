import React, {useEffect, useState} from "react";
import Particles, {initParticlesEngine} from "@tsparticles/react";
import {loadFull} from "tsparticles";
import logo from "./logo.svg";
import "./App.css";
import particlesOptions from "./particles.json";
import Home from "./Home.js";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";



function App() {
    const [init, setInit] = useState(false);

    useEffect(() => {
        if (init) {
            return;
        }

        initParticlesEngine(async (engine) => {
            await loadFull(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    return (
        <div className="App">
            <title>Brendan Lo</title>
            {init && <Particles options={particlesOptions}/>}
            <header className="App-header">
                <meta charset="UTF-8"/>
                <meta name="description" content="Brendan Lo's website.. Still in development"/>
                <meta name="keywords" content="Brendan Lo, brendanlo.xyz, blo, BrendanLo4, Brendan4, blo4"/>
                <meta name="author" content="Brendan Lo"/>
                <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            </header>
            <main className = "App-main">
            <h1>Brendan Lo</h1>
                    <div id = "socialMedia">
                        <a href = "https://www.instagram.com/brendanloalt/" target = "_blank">
                            <img src = "https://img.icons8.com/?size=100&id=43625&format=png&color=000000" width = "50"></img>
                        </a>
                        <a href = "https://discord.com/users/774759153893507123" target = "_blank">
                            <img src = "https://img.icons8.com/?size=100&id=61604&format=png&color=000000" width = "50"></img>
                        </a>
                        <a href = "https://www.linkedin.com/in/brendan-lo-8b0b80247" target = "_blank">
                            <img src = "https://img.icons8.com/?size=100&id=44019&format=png&color=000000" width = "50"></img>
                        </a>
                        <a href = "https://github.com/patriotsbreeze" target = "_blank">
                            <img src = "https://img.icons8.com/?size=100&id=52539&format=png&color=000000" width = "50"></img>
                        </a>
                        <a href = "mailto:contact@brendanlo.xyz" target = "_blank">
                            <img src = "https://img.icons8.com/?size=100&id=43999&format=png&color=000000" width = "50"></img>
                        </a>
                        <a href = "https://www.youtube.com/@brendan430" target = "_blank">
                            <img src = "https://img.icons8.com/?size=100&id=44112&format=png&color=000000" width = "50"></img>
                        </a>
                        <a href = "https://open.spotify.com/user/1jqfcl3a716rdyg1gsi0rzc0v?si=f406480cd5cf4b8b" target = "_blank">
                            <img src = "https://img.icons8.com/?size=100&id=49479&format=png&color=000000" width = "50"></img>
                        </a>
                    </div>
                    <div>
                        <p>Website is still in development.. check back later!!!</p>
                    </div>
            </main>
        </div>
    );
}

export default App;
